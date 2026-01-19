/**
 * Dialogue Policy for Natural Human-like Conversation Flow
 * Removes robotic patterns and replaces them with natural pacing
 */

export type ReplyType = 'question' | 'statement' | 'acknowledgment' | 'observation'

export interface DialogueAction {
  type: ReplyType
  confidence: number // 0.0 to 1.0
  reasoning: string
}

export interface DialoguePolicyState {
  last_3_actions: Array<{
    type: ReplyType
    timestamp: string
  }>
  last_user_verbosity: 'short' | 'medium' | 'long' // Based on message length
  silence_duration: number // Seconds since last user message (client-side)
  question_cooldown: number // Turns until next question allowed
  recent_topics_asked: string[] // Track what's been asked recently
}

export interface DialogueContext {
  last_user_reply: string
  last_user_reply_type: 'open' | 'closed' | 'silence'
  last_ai_intent: string
  current_emotion?: {
    label: string
    confidence: number
  }
  turn_count: number
  last_ai_message_was_question?: boolean // Track if last AI message was a question
  user_engagement?: 'open' | 'neutral' | 'closed' // Classified engagement level
}

/**
 * Classifies a user message by verbosity
 */
export function classifyVerbosity(message: string): 'short' | 'medium' | 'long' {
  const length = message.trim().length
  
  if (length < 20) return 'short'
  if (length < 100) return 'medium'
  return 'long'
}

/**
 * Classifies user engagement level based on message content
 * Returns "open" if user is sharing, "closed" if minimal/deflecting, "neutral" otherwise
 */
export function classifyUserEngagement(
  lastUserMessage: string,
  recentMessages?: Array<{ text: string; replyType?: 'open' | 'closed' | 'silence' }>
): 'open' | 'neutral' | 'closed' {
  if (!lastUserMessage || lastUserMessage.trim().length === 0) {
    return 'closed'
  }
  
  const trimmed = lastUserMessage.trim()
  const lowerText = trimmed.toLowerCase()
  const words = trimmed.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  
  // Closed indicators: very short messages or specific closed responses
  const closedPhrases = [
    'nothing',
    'idk',
    "i don't know",
    "don't know",
    'nah',
    'nope',
    'no',
    'yes',
    'yep',
    'yup',
    'ok',
    'okay',
    'sure',
    'alright',
    'just chilling',
    'just vibing',
    'not really',
    'nothing much',
    'nothing special',
    'same',
    'cool',
    'nice',
    'lol',
    'haha',
    'yeah',
    'mhm',
    'mm',
    'hmm',
  ]
  
  // Check for closed phrases (exact match or very short with closed word)
  if (wordCount <= 3) {
    // Very short message - check if it's a closed phrase
    const isClosedPhrase = closedPhrases.some(phrase => {
      const phraseWords = phrase.split(/\s+/)
      // Check if message matches phrase exactly or is just one of the closed words
      return lowerText === phrase || 
             (wordCount === 1 && phraseWords.includes(lowerText)) ||
             (wordCount === 2 && phraseWords.slice(0, 2).every(w => lowerText.includes(w)))
    })
    
    if (isClosedPhrase || wordCount <= 2) {
      return 'closed'
    }
  }
  
  // Open indicators: longer messages or clear sharing
  if (wordCount > 15) {
    return 'open'
  }
  
  // Check for emotional sharing, problems, or detailed content
  const openIndicators = [
    /\b(feel|feeling|felt|emotion|stress|stressed|anxious|worried|sad|happy|excited|frustrated|angry|tired|exhausted)\b/i,
    /\b(problem|issue|struggling|difficult|hard|tough|challenge)\b/i,
    /\b(tell|told|share|sharing|explain|explained|happened|happening)\b/i,
    /\b(because|since|reason|why|how|what happened)\b/i,
  ]
  
  const hasOpenIndicators = openIndicators.some(pattern => pattern.test(trimmed))
  if (hasOpenIndicators && wordCount > 5) {
    return 'open'
  }
  
  // Default to neutral for medium-length messages without clear indicators
  return 'neutral'
}

/**
 * Analyzes the last AI response to classify its type
 */
export function classifyAIResponse(text: string): ReplyType {
  const lowerText = text.toLowerCase().trim()
  
  // Check if it ends with a question mark
  if (lowerText.endsWith('?')) {
    return 'question'
  }
  
  // Check for micro-acknowledgments (short confirmations)
  const microAcknowledgmentPatterns = [
    /^(gotcha|fair|makes sense|yeah,? true|right|ok|okay|cool|nice|alright|sure|yeah|yep)$/i,
    /^(got it|i see|i understand|noted|okay,? cool)$/i,
  ]
  
  for (const pattern of microAcknowledgmentPatterns) {
    if (pattern.test(lowerText)) {
      return 'acknowledgment'
    }
  }
  
  // Check for observations (contextual statements)
  const observationPatterns = [
    /^(you seem|looks like|it seems|you're pretty|sounds like)/i,
    /^(that's|here's|there's|it's)/i,
  ]
  
  for (const pattern of observationPatterns) {
    if (pattern.test(lowerText)) {
      return 'observation'
    }
  }
  
  // Default to statement
  return 'statement'
}

/**
 * Determines allowed next actions based on dialogue policy
 */
export function determineAllowedActions(
  policyState: DialoguePolicyState,
  context: DialogueContext
): {
  allowed: ReplyType[]
  disallowed: ReplyType[]
  preferred: ReplyType
  reasoning: string
} {
  const allowed: ReplyType[] = []
  const disallowed: ReplyType[] = []
  let preferred: ReplyType = 'statement'
  let reasoning = ''
  
  // Do not interrogate the user.
  // If engagement is "closed" or last AI message was a question, disallow question-type actions.
  
  // Rule 1: Stop reflexive questions - NEVER ask questions in consecutive turns
  const isCooldownActive = policyState.question_cooldown > 0
  const lastActionWasQuestion = policyState.last_3_actions.length > 0 && 
    policyState.last_3_actions[policyState.last_3_actions.length - 1].type === 'question'
  const twoQuestionsInARow = policyState.last_3_actions.length >= 2 &&
    policyState.last_3_actions.slice(-2).every(a => a.type === 'question')
  
  // Also check explicit flag if provided
  const lastAiWasQuestion = context.last_ai_message_was_question ?? lastActionWasQuestion
  
  // Classify user engagement if not provided
  const userEngagement = context.user_engagement ?? classifyUserEngagement(context.last_user_reply)
  
  // Always disallow questions if we just asked one OR engagement is closed
  if (isCooldownActive || lastActionWasQuestion || twoQuestionsInARow || lastAiWasQuestion || userEngagement === 'closed') {
    disallowed.push('question')
    if (userEngagement === 'closed') {
      reasoning += 'User engagement is closed - do not interrogate. '
    } else {
      reasoning += 'Question cooldown active - never ask questions in consecutive turns. '
    }
  } else {
    // Questions are allowed but should be rare (10-20% base probability)
    // Only add to allowed if conditions are right AND engagement is not closed
    if (userEngagement !== 'closed') {
      allowed.push('question')
    }
  }
  
  // Rule 2: Short answers = statements, NOT questions
  // Force statement if engagement is closed or message is very short
  if (userEngagement === 'closed' || context.last_user_reply_type === 'closed' || policyState.last_user_verbosity === 'short') {
    disallowed.push('question')
    preferred = 'statement'
    allowed.push('statement', 'acknowledgment', 'observation')
    reasoning += 'User gave short/closed reply - respond with statement or thought, NOT a question. '
  }
  
  // Rule 3: Silence tolerance
  if (context.last_user_reply_type === 'silence') {
    // Only allow soft engagement after 15-30s of silence
    if (policyState.silence_duration > 30) {
      allowed.push('observation', 'statement')
      disallowed.push('question')
      preferred = 'observation'
      reasoning += 'Extended silence detected, soft engagement. '
    } else {
      allowed.push('acknowledgment')
      preferred = 'acknowledgment'
      reasoning += 'Brief silence, minimal acknowledgment. '
    }
  }
  
  // Rule 4: If user is quiet or brief, fill with your own thoughts, not interrogation
  const shouldPreferStatement = 
    userEngagement === 'closed' ||
    policyState.last_user_verbosity === 'short' ||
    context.last_user_reply_type === 'closed' ||
    lastActionWasQuestion ||
    lastAiWasQuestion ||
    context.last_user_reply_type === 'silence'
  
  if (shouldPreferStatement) {
    preferred = 'statement'
    allowed.push('statement', 'observation', 'acknowledgment')
    disallowed.push('question')
    reasoning += 'User is quiet/brief - share your own thoughts or observations, not questions. '
  }
  
  // Rule 5: Emotional tie-in
  if (context.current_emotion && context.current_emotion.confidence >= 0.6) {
    const emotion = context.current_emotion.label
    
    if (emotion === 'tired' || emotion === 'down') {
      preferred = 'observation'
      allowed.push('observation', 'statement')
      disallowed.push('question')
      reasoning += `Emotion: ${emotion}, prefer reflective. `
    } else if (emotion === 'stressed' || emotion === 'frustrated') {
      preferred = 'acknowledgment'
      allowed.push('acknowledgment', 'statement')
      disallowed.push('question')
      reasoning += `Emotion: ${emotion}, prefer calm confirmation. `
    } else if (emotion === 'upbeat') {
      allowed.push('statement', 'question')
      reasoning += `Emotion: ${emotion}, allow varied response. `
    }
  }
  
  // Default: prefer statements 85% of the time, questions are rare
  if (allowed.length === 0) {
    allowed.push('statement', 'observation', 'acknowledgment')
    // Questions are only allowed if no cooldown AND not after short replies
    if (!isCooldownActive && !lastActionWasQuestion && policyState.last_user_verbosity !== 'short') {
      allowed.push('question')
    }
  }
  
  // Ensure statements are preferred by default (85% of the time)
  if (!preferred || preferred === 'question') {
    preferred = 'statement'
  }
  if (preferred === 'question' && !allowed.includes('statement')) {
    preferred = allowed[0] || 'statement'
  }
  
  // Ensure preferred is in allowed
  if (!allowed.includes(preferred)) {
    preferred = allowed[0] || 'statement'
  }
  
  return { allowed, disallowed, preferred, reasoning }
}

/**
 * Determines if a specific action should be taken
 */
export function decideNextAction(
  policyState: DialoguePolicyState,
  context: DialogueContext
): DialogueAction {
  const { allowed, disallowed, preferred, reasoning } = determineAllowedActions(policyState, context)
  
  return {
    type: preferred,
    confidence: allowed.includes(preferred) ? 0.9 : 0.5,
    reasoning,
  }
}

/**
 * Updates dialogue policy state after an action
 */
export function updatePolicyState(
  currentState: DialoguePolicyState,
  actionTaken: ReplyType,
  userMessage: string
): DialoguePolicyState {
  // Update last 3 actions (ring buffer)
  const updatedLastActions = [...currentState.last_3_actions]
  updatedLastActions.push({
    type: actionTaken,
    timestamp: new Date().toISOString(),
  })
  if (updatedLastActions.length > 3) {
    updatedLastActions.shift()
  }
  
  // Update question cooldown - longer cooldown to prevent consecutive questions
  let questionCooldown = currentState.question_cooldown
  if (actionTaken === 'question') {
    questionCooldown = 5 // Longer cooldown: never ask questions in consecutive turns
  } else {
    questionCooldown = Math.max(0, questionCooldown - 1) // Decrement
  }
  
  // Update verbosity classification
  const verbosity = classifyVerbosity(userMessage)
  
  return {
    last_3_actions: updatedLastActions,
    last_user_verbosity: verbosity,
    silence_duration: 0, // Reset on user message
    question_cooldown: questionCooldown,
    recent_topics_asked: currentState.recent_topics_asked, // Keep as-is
  }
}

/**
 * Generates dialogue policy context for system prompt
 */
export function generateDialoguePolicyContext(
  policyState: DialoguePolicyState,
  context: DialogueContext
): Record<string, any> {
  const { allowed, disallowed, preferred, reasoning } = determineAllowedActions(policyState, context)
  
  return {
    last_user_reply: context.last_user_reply_type,
    last_ai_action: policyState.last_3_actions.length > 0 
      ? policyState.last_3_actions[policyState.last_3_actions.length - 1].type 
      : 'none',
    allowed_next_actions: allowed,
    disallowed_actions: disallowed,
    preferred_action: preferred,
    reasoning,
  }
}

/**
 * Generate dialogue policy instruction text
 */
export function generateDialoguePolicyInstruction(
  policyState: DialoguePolicyState,
  context: DialogueContext
): string {
  const { allowed, disallowed, preferred } = determineAllowedActions(policyState, context)
  
  let instruction = ''
  
  // This function is no longer used in main system prompt (replaced by conversationStyle block)
  // Keep minimal for backward compatibility
  if (disallowed.includes('question')) {
    instruction += `Do NOT ask a question right now—they've been brief or you just asked one. Share your own thoughts, feelings, or observations instead.\n`
  }
  
  const userEngagement = context.user_engagement ?? classifyUserEngagement(context.last_user_reply)
  
  if (preferred === 'statement' && (userEngagement === 'closed' || context.last_user_reply_type === 'closed' || policyState.last_user_verbosity === 'short')) {
    instruction += `They gave a short or closed answer. Do NOT ask another question. Respond with a brief acknowledgment or a one-line comment about your own state/mood. Keep it very short.\n`
  }
  
  if (preferred === 'observation' && context.last_user_reply_type === 'silence') {
    instruction += `They've been quiet. Share a casual observation or your own thought rather than asking something.\n`
  }
  
  return instruction.trim()
}

