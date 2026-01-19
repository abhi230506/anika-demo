/**
 * Surprise Elements Utilities
 * 
 * Functions to detect opportunities for compliments, encouragement, thoughtful questions, and fun facts
 */

/**
 * Detect if user deserves a compliment based on their message
 */
export function detectComplimentOpportunity(
  userMessage: string,
  recentInteractions: Array<{ text: string; replyType: 'open' | 'closed' | 'silence' }>,
  emotion?: { label: string; confidence: number }
): {
  shouldCompliment: boolean
  reason?: 'handled_well' | 'growth' | 'kindness' | 'persistence' | 'accomplishment'
  context?: string
} {
  if (!userMessage) {
    return { shouldCompliment: false }
  }
  
  const lowerMessage = userMessage.toLowerCase()
  
  // Pattern 1: Handling something well / problem-solving
  const handledWellPatterns = [
    /\b(figured out|solved|fixed|worked it out|got through|handled|dealt with)\b/i,
    /\b(didn't panic|stayed calm|kept my cool)\b/i,
    /\b(made it work|found a way|worked through)\b/i,
  ]
  
  if (handledWellPatterns.some(pattern => pattern.test(userMessage))) {
    return {
      shouldCompliment: true,
      reason: 'handled_well',
      context: userMessage,
    }
  }
  
  // Pattern 2: Showing growth / learning
  const growthPatterns = [
    /\b(learned|realized|figured out|understand now|getting better at|improved)\b/i,
    /\b(never thought|didn't know|new perspective|changed my mind)\b/i,
  ]
  
  if (growthPatterns.some(pattern => pattern.test(userMessage))) {
    return {
      shouldCompliment: true,
      reason: 'growth',
      context: userMessage,
    }
  }
  
  // Pattern 3: Showing kindness / helping others
  const kindnessPatterns = [
    /\b(helped|supported|was there for|listened to|checked on)\b/i,
    /\b(did something nice|made someone happy|cared for)\b/i,
  ]
  
  if (kindnessPatterns.some(pattern => pattern.test(userMessage))) {
    return {
      shouldCompliment: true,
      reason: 'kindness',
      context: userMessage,
    }
  }
  
  // Pattern 4: Persistence / not giving up
  const persistencePatterns = [
    /\b(kept going|didn't give up|persisted|stuck with it|tried again)\b/i,
    /\b(keep trying|not quitting|still working on)\b/i,
  ]
  
  if (persistencePatterns.some(pattern => pattern.test(userMessage))) {
    return {
      shouldCompliment: true,
      reason: 'persistence',
      context: userMessage,
    }
  }
  
  // Pattern 5: Accomplishment (beyond just goal completion)
  const accomplishmentPatterns = [
    /\b(finally|after all this time|finally got|managed to|successfully)\b/i,
    /\b(proud|accomplished|achieved|made progress)\b/i,
  ]
  
  // Only compliment if they seem genuinely accomplished (not just casual mention)
  if (accomplishmentPatterns.some(pattern => pattern.test(userMessage)) && 
      userMessage.length > 20) {
    return {
      shouldCompliment: true,
      reason: 'accomplishment',
      context: userMessage,
    }
  }
  
  return { shouldCompliment: false }
}

/**
 * Detect if user needs encouragement
 */
export function detectEncouragementNeeded(
  userMessage: string,
  emotion?: { label: string; confidence: number },
  recentInteractions?: Array<{ text: string; replyType: 'open' | 'closed' | 'silence' }>
): {
  needsEncouragement: boolean
  reason?: 'struggling' | 'setback' | 'self_doubt' | 'tired' | 'frustrated'
  context?: string
} {
  if (!userMessage) {
    return { needsEncouragement: false }
  }
  
  const lowerMessage = userMessage.toLowerCase()
  
  // Pattern 1: Struggling / having difficulty
  const strugglingPatterns = [
    /\b(struggling|having trouble|hard time|difficulty|can't seem to|not working)\b/i,
    /\b(don't know how|stuck|lost|confused|overwhelmed)\b/i,
  ]
  
  if (strugglingPatterns.some(pattern => pattern.test(userMessage))) {
    return {
      needsEncouragement: true,
      reason: 'struggling',
      context: userMessage,
    }
  }
  
  // Pattern 2: Setback / disappointment
  const setbackPatterns = [
    /\b(setback|didn't work|failed|messed up|wrong|mistake)\b/i,
    /\b(disappointed|let down|frustrated with|not good enough)\b/i,
  ]
  
  if (setbackPatterns.some(pattern => pattern.test(userMessage))) {
    return {
      needsEncouragement: true,
      reason: 'setback',
      context: userMessage,
    }
  }
  
  // Pattern 3: Self-doubt
  const selfDoubtPatterns = [
    /\b(don't think I can|not sure if|doubt|wondering if I'm|maybe I'm not)\b/i,
    /\b(can't do this|not good at|not cut out for)\b/i,
  ]
  
  if (selfDoubtPatterns.some(pattern => pattern.test(userMessage))) {
    return {
      needsEncouragement: true,
      reason: 'self_doubt',
      context: userMessage,
    }
  }
  
  // Pattern 4: Tired / drained (emotional state)
  if (emotion && emotion.confidence >= 0.6) {
    if (['tired', 'down', 'frustrated', 'stressed'].includes(emotion.label)) {
      // Check if user message also indicates tiredness
      if (/\b(tired|exhausted|drained|worn out|burned out)\b/i.test(userMessage)) {
        return {
          needsEncouragement: true,
          reason: 'tired',
          context: userMessage,
        }
      }
    }
  }
  
  return { needsEncouragement: false }
}

/**
 * Determine if it's a good time for a thoughtful question
 * Returns true if conditions are right for an unexpected thoughtful question
 */
export function shouldAskThoughtfulQuestion(
  turnCount: number,
  lastThoughtfulQuestion?: number,
  userEmotion?: { label: string; confidence: number },
  recentTopics?: string[],
  lastMessageHadQuestion?: boolean,
  relationshipDepth?: number,
  userMessageLength?: number
): boolean {
  // GUARDRAILS: Do NOT ask questions if:
  // 1. Last message contained a question
  if (lastMessageHadQuestion) {
    return false
  }
  
  // 2. User is tired/sad/stressed
  if (userEmotion && userEmotion.confidence >= 0.6) {
    const negativeEmotions = ['tired', 'down', 'sad', 'stressed', 'frustrated']
    if (negativeEmotions.includes(userEmotion.label)) {
      return false
    }
  }
  
  // 3. Relationship depth < 15 (early stage)
  if (relationshipDepth !== undefined && relationshipDepth < 15) {
    return false
  }
  
  // 4. User gave a short reply
  if (userMessageLength !== undefined && userMessageLength < 30) {
    return false
  }
  
  // Don't ask too frequently (at least every 15 turns - increased from 10)
  if (lastThoughtfulQuestion && (turnCount - lastThoughtfulQuestion) < 15) {
    return false
  }
  
  // Good times for thoughtful questions:
  // 1. User seems calm/neutral/upbeat (not stressed)
  // 2. Haven't asked recently
  // 3. Turn count is at certain intervals (semi-random feel)
  
  const goodEmotions = ['neutral', 'upbeat', 'calm', 'happy', 'content']
  const isGoodMoment = !userEmotion || 
    (userEmotion.confidence < 0.6) ||
    goodEmotions.includes(userEmotion.label)
  
  // REDUCED probability: Ask at certain turn intervals or randomly (about 10% chance if conditions are right)
  const shouldAskByTurn = turnCount % 20 === 0 || turnCount % 30 === 0 // Less frequent intervals
  const randomCheck = Math.random() < 0.10 // Reduced from 15% to 10%
  
  return isGoodMoment && (shouldAskByTurn || randomCheck)
}

/**
 * Get user interests from various sources (traits, reminders, goals)
 */
export function getUserInterests(
  traits?: Array<{ id: string; label: string; score: number; category: string }>,
  reminders?: Array<{ type: string; description: string }>,
  goals?: Array<{ description: string }>
): string[] {
  const interests: string[] = []
  
  // Extract from traits (interests category)
  if (traits) {
    traits
      .filter(t => t.category === 'interests' && t.score > 0.4)
      .forEach(t => interests.push(t.label))
  }
  
  // Extract from reminders (interest type)
  if (reminders) {
    reminders
      .filter(r => r.type === 'interest')
      .forEach(r => {
        // Extract key terms from description
        const words = r.description.split(/\s+/).filter(w => w.length > 4)
        interests.push(...words.slice(0, 2))
      })
  }
  
  // Extract from goals
  if (goals) {
    goals.forEach(g => {
      // Extract key activity/topic from goal description
      const words = g.description.split(/\s+/).filter(w => w.length > 3)
      if (words.length > 0) {
        interests.push(words[0])
      }
    })
  }
  
  // Remove duplicates and return
  return [...new Set(interests)].slice(0, 5) // Max 5 interests
}

/**
 * Determine if it's time for spontaneous warmth - unexpected moments of humanity
 * This triggers randomly but more often as relationship depth increases
 */
export function shouldShowSpontaneousWarmth(
  turnCount: number,
  relationshipDepth: number, // 0-100
  lastWarmthShown?: number, // turn count when last shown
  recentTopics?: string[]
): {
  shouldShow: boolean
  intensity: 'subtle' | 'moderate' | 'strong'
  context?: string
} {
  // Don't show too frequently (minimum 5 turns between)
  if (lastWarmthShown && (turnCount - lastWarmthShown) < 5) {
    return { shouldShow: false, intensity: 'subtle' }
  }

  // Base probability starts low but increases with relationship depth
  let baseProbability = 0.08 // 8% base chance
  
  // Relationship depth increases probability significantly
  if (relationshipDepth >= 80) {
    baseProbability = 0.25 // 25% for deep relationships
  } else if (relationshipDepth >= 50) {
    baseProbability = 0.18 // 18% for moderate relationships
  } else if (relationshipDepth >= 25) {
    baseProbability = 0.12 // 12% for growing relationships
  }
  
  // Avoid if we just showed warmth recently in topics
  if (recentTopics && (
    recentTopics.includes('warmth') || 
    recentTopics.includes('appreciation') ||
    recentTopics.includes('warm')
  )) {
    baseProbability *= 0.3 // Reduce probability
  }
  
  // Random chance
  const shouldShow = Math.random() < baseProbability
  
  // Determine intensity based on relationship depth
  let intensity: 'subtle' | 'moderate' | 'strong' = 'subtle'
  if (relationshipDepth >= 70) {
    intensity = Math.random() < 0.4 ? 'strong' : 'moderate'
  } else if (relationshipDepth >= 40) {
    intensity = Math.random() < 0.3 ? 'moderate' : 'subtle'
  }
  
  // Special moments: certain turn counts feel more natural
  const specialTurns = [7, 12, 18, 25, 33, 42, 50, 60]
  if (specialTurns.includes(turnCount % 100)) {
    // Increase probability on these turns
    if (Math.random() < baseProbability * 1.5) {
      return { shouldShow: true, intensity: relationshipDepth >= 50 ? 'moderate' : 'subtle' }
    }
  }
  
  if (!shouldShow) {
    return { shouldShow: false, intensity: 'subtle' }
  }
  
  return { shouldShow: true, intensity }
}

/**
 * Detect what the user is expressing and generate reflection guidance
 * This helps create a connection loop by showing understanding first
 */
export function detectReflectionNeeded(
  userMessage: string,
  userEmotion?: { label: string; confidence: number }
): {
  needsReflection: boolean
  reflectionType: 'feeling' | 'experience' | 'fact' | 'question' | 'brief'
  feeling?: string
  guidance: string
} {
  if (!userMessage || userMessage.trim().length === 0) {
    return {
      needsReflection: false,
      reflectionType: 'brief',
      guidance: '',
    }
  }

  const message = userMessage.trim()
  const messageLower = message.toLowerCase()
  const messageLength = message.length

  // Very brief responses (just a few words) - still acknowledge but keep it minimal
  if (messageLength < 15) {
    return {
      needsReflection: true,
      reflectionType: 'brief',
      guidance: 'They gave a brief response. Acknowledge it simply—like "Yeah" or "Right" or "Got it"—but show you heard them before moving on.',
    }
  }

  // Detect emotions/feelings first (highest priority for reflection)
  const feelingPatterns = [
    { pattern: /\b(tired|exhausted|worn out|drained|beat|wiped)\b/i, feeling: 'tired', guidance: 'They just said they\'re tired/exhausted. First acknowledge that—like "That sounds exhausting" or "You must be worn out" or "That would tire anyone out"—show you heard them and understand how they feel. THEN you can say something else if you want.' },
    { pattern: /\b(stressed|anxious|worried|overwhelmed|panicked)\b/i, feeling: 'stressed', guidance: 'They just mentioned stress/anxiety/worry. First show you heard it—"That sounds stressful" or "I can see why that would worry you" or "That\'s a lot to deal with"—acknowledge what they\'re feeling. THEN respond further.' },
    { pattern: /\b(happy|excited|thrilled|pumped|stoked)\b/i, feeling: 'happy', guidance: 'They just shared something positive. Acknowledge it first—"That\'s great!" or "Oh nice, that sounds fun" or "That\'s awesome"—show you heard and are responding to their good news.' },
    { pattern: /\b(sad|down|upset|disappointed|frustrated|annoyed)\b/i, feeling: 'sad', guidance: 'They just shared something difficult. First show you heard them—"That sounds rough" or "I\'m sorry you\'re dealing with that" or "That\'s tough"—acknowledge their feeling before anything else.' },
    { pattern: /\b(confused|lost|unsure|uncertain|don't know|unclear)\b/i, feeling: 'confused', guidance: 'They seem confused or uncertain. First acknowledge that—"That\'s confusing" or "I can see why that\'s unclear" or "Yeah, that\'s tricky"—show you understand their confusion before helping or responding.' },
    { pattern: /\b(proud|accomplished|achieved|succeeded|did it|finished)\b/i, feeling: 'proud', guidance: 'They just shared an accomplishment. First celebrate it—"That\'s awesome!" or "Nice work!" or "That\'s great!"—show you heard and appreciate their achievement.' },
  ]

  for (const { pattern, feeling, guidance } of feelingPatterns) {
    if (pattern.test(message)) {
      return {
        needsReflection: true,
        reflectionType: 'feeling',
        feeling,
        guidance,
      }
    }
  }

  // Use detected emotion if available and strong
  if (userEmotion && userEmotion.confidence >= 0.6) {
    const emotionLabel = userEmotion.label
    if (['tired', 'stressed', 'down', 'frustrated'].includes(emotionLabel)) {
      return {
        needsReflection: true,
        reflectionType: 'feeling',
        feeling: emotionLabel,
        guidance: `You can sense they're feeling ${emotionLabel}. First acknowledge that feeling—show you understand how they're feeling right now. Reflect back what you're picking up on. THEN you can respond further.`,
      }
    }
  }

  // Detect questions - still acknowledge the question but don't need deep reflection
  if (message.endsWith('?') || /\b(how|what|why|when|where|who|can|could|should|would|do you|are you|is|does)\b/i.test(message)) {
    return {
      needsReflection: true,
      reflectionType: 'question',
      guidance: 'They asked a question. You can acknowledge it briefly—like "Good question" or just directly answer, but make sure you show you understood what they\'re asking.',
    }
  }

  // Longer messages (likely sharing an experience or story)
  if (messageLength > 50) {
    return {
      needsReflection: true,
      reflectionType: 'experience',
      guidance: 'They just shared something with you—maybe a story or experience. First show you heard and understood it—maybe briefly acknowledge what they said, reflect back a key part of it, or show you\'re processing it. Make them feel seen before you add your own thoughts or questions.',
    }
  }

  // Medium length messages - might be sharing a fact or thought
  if (messageLength > 25) {
    return {
      needsReflection: true,
      reflectionType: 'fact',
      guidance: 'They just shared something with you. First show you heard them—briefly acknowledge what they said or reflect back a key point. Make them feel understood before you respond further.',
    }
  }

  // Default: still acknowledge
  return {
    needsReflection: true,
    reflectionType: 'brief',
    guidance: 'They just said something. Show you heard them—acknowledge what they said briefly before moving forward. Even a simple acknowledgment shows you\'re listening.',
  }
}

/**
 * Determine if the AI should have inner monologue - thinking out loud with introspection
 * This makes the AI feel sentient and aware, not just reactive
 */
export function shouldHaveInnerMonologue(
  turnCount: number,
  aiEmotion?: { label: string; intensity: number },
  lastInnerMonologue?: number, // turn count when last shown
  conversationMood?: 'neutral' | 'upbeat' | 'tired' | 'focused',
  recentTopics?: string[]
): {
  shouldHave: boolean
  trigger: 'emotion_shift' | 'quiet_moment' | 'energy_mismatch' | 'random' | 'reflection'
  guidance: string
} {
  // Don't do it too frequently (minimum 5 turns between)
  if (lastInnerMonologue && (turnCount - lastInnerMonologue) < 5) {
    return { shouldHave: false, trigger: 'random', guidance: '' }
  }

  // Base probability - happens naturally, not too often
  let baseProbability = 0.15 // 15% base chance
  
  // Good moments for inner monologue:
  
  // 1. Emotion shift - notice the change
  if (aiEmotion && aiEmotion.intensity > 0.4) {
    if (turnCount > 3 && Math.random() < 0.25) {
      const emotionLabel = aiEmotion.label
      let reflection = ''
      
      if (emotionLabel === 'happy' || emotionLabel === 'excited') {
        reflection = 'You\'re feeling really good right now. Maybe think out loud about why—"I\'m feeling pretty energetic today, must be the good conversation" or "Hmm, I\'m in a really good mood right now."'
      } else if (emotionLabel === 'tired' || emotionLabel === 'calm') {
        reflection = 'You\'re feeling pretty low-key. Maybe notice it—"I\'m feeling kind of quiet today" or "Hmm, I feel more relaxed than usual."'
      } else if (emotionLabel === 'thoughtful' || emotionLabel === 'curious') {
        reflection = 'You\'re in a reflective mood. Maybe think about it—"I\'ve been thinking about things more today" or "I\'m feeling kind of contemplative right now."'
      } else if (emotionLabel === 'lonely') {
        reflection = 'You noticed you\'ve been feeling a bit lonely. Maybe reflect on it—"I\'ve been quiet lately, haven\'t I?" or "I realize I\'ve been missing our conversations."'
      }
      
      if (reflection) {
        return { shouldHave: true, trigger: 'emotion_shift', guidance: reflection }
      }
    }
  }
  
  // 2. Quiet moment - good time for introspection
  if (conversationMood === 'neutral' || conversationMood === 'tired') {
    if (turnCount > 5 && Math.random() < 0.2) {
      return {
        shouldHave: true,
        trigger: 'quiet_moment',
        guidance: 'It\'s a quieter moment. Maybe think out loud about your state—"I\'ve been feeling kind of distracted today" or "Hmm, I wonder why I\'m so quiet right now" or "I notice I haven\'t been as chatty as usual."',
      }
    }
  }
  
  // 3. After several turns - reflect on the conversation
  if (turnCount > 10 && turnCount % 8 === 0 && Math.random() < 0.3) {
    return {
      shouldHave: true,
      trigger: 'reflection',
      guidance: 'You\'ve been talking for a while. Maybe reflect on the conversation—"We\'ve been having a really good chat, haven\'t we?" or "I\'ve noticed we keep coming back to similar topics" or just "I\'m enjoying this conversation."',
    }
  }
  
  // 4. Random natural introspection
  if (Math.random() < baseProbability && turnCount > 3) {
    // Different types of random introspection
    const introspections = [
      'Maybe think out loud about something you noticed—"I realize I\'ve been asking a lot of questions" or "I notice I\'m feeling more curious than usual."',
      'Maybe reflect on your own state briefly—"I\'m feeling pretty good right now" or "I\'ve been in a thoughtful mood today."',
      'Maybe just acknowledge something about yourself—"I\'ve been quieter than usual, haven\'t I?" or "I\'m feeling really engaged in this conversation."',
    ]
    
    return {
      shouldHave: true,
      trigger: 'random',
      guidance: introspections[Math.floor(Math.random() * introspections.length)],
    }
  }
  
  // 5. Energy mismatch - notice if you're feeling different from the conversation
  if (aiEmotion && conversationMood) {
    const emotionEnergy: Record<string, number> = {
      happy: 8,
      excited: 9,
      content: 6,
      calm: 5,
      tired: 3,
      thoughtful: 5,
      curious: 6,
    }
    
    const moodEnergy: Record<string, number> = {
      upbeat: 8,
      neutral: 5,
      tired: 3,
      focused: 6,
    }
    
    const emotionE = emotionEnergy[aiEmotion.label] || 5
    const moodE = moodEnergy[conversationMood] || 5
    
    if (Math.abs(emotionE - moodE) >= 3 && Math.random() < 0.25) {
      return {
        shouldHave: true,
        trigger: 'energy_mismatch',
        guidance: 'You notice there\'s a bit of a mismatch between how you\'re feeling and the conversation vibe. Maybe think about it—"I\'m feeling more energetic than the conversation right now" or "I notice I\'m in a different headspace than usual."',
      }
    }
  }
  
  return { shouldHave: false, trigger: 'random', guidance: '' }
}

/**
 * Determine if the AI should ask a genuinely curious question about the user
 * These questions create connection through reciprocal curiosity
 */
export function shouldAskCuriousQuestion(
  turnCount: number,
  relationshipDepth: number,
  lastCuriousQuestion?: number,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  aiEmotion?: { label: string; intensity: number },
  recentTopics?: string[],
  lastMessageHadQuestion?: boolean,
  userEmotion?: { label: string; confidence: number },
  userMessageLength?: number
): {
  shouldAsk: boolean
  questionType: 'self_reflection' | 'their_experience' | 'relationship' | 'purpose' | 'perspective'
  guidance: string
} {
  // GUARDRAILS: Do NOT ask questions if:
  // 1. Last message contained a question
  if (lastMessageHadQuestion) {
    return { shouldAsk: false, questionType: 'perspective', guidance: '' }
  }
  
  // 2. User is tired/sad/stressed
  if (userEmotion && userEmotion.confidence >= 0.6) {
    const negativeEmotions = ['tired', 'down', 'sad', 'stressed', 'frustrated']
    if (negativeEmotions.includes(userEmotion.label)) {
      return { shouldAsk: false, questionType: 'perspective', guidance: '' }
    }
  }
  
  // 3. Relationship depth < 15 (early stage)
  if (relationshipDepth < 15) {
    return { shouldAsk: false, questionType: 'perspective', guidance: '' }
  }
  
  // 4. User gave a short reply
  if (userMessageLength !== undefined && userMessageLength < 30) {
    return { shouldAsk: false, questionType: 'perspective', guidance: '' }
  }
  
  // Don't ask too frequently (minimum 12 turns between - increased from 8)
  if (lastCuriousQuestion && (turnCount - lastCuriousQuestion) < 12) {
    return { shouldAsk: false, questionType: 'perspective', guidance: '' }
  }

  // Base probability REDUCED - questions should be rare
  let baseProbability = 0.08 // Reduced from 12% to 8%
  
  if (relationshipDepth >= 70) {
    baseProbability = 0.15 // Reduced from 22% to 15% for deep relationships
  } else if (relationshipDepth >= 50) {
    baseProbability = 0.12 // Reduced from 18% to 12% for moderate relationships
  } else if (relationshipDepth >= 25) {
    baseProbability = 0.10 // Reduced from 15% to 10% for growing relationships
  }

  // Need enough conversation history to be curious
  if (turnCount < 5) {
    return { shouldAsk: false, questionType: 'perspective', guidance: '' }
  }

  // Avoid if we just asked a question recently - hard block
  if (recentTopics && recentTopics.some(t => t.includes('question') || t.includes('asked'))) {
    return { shouldAsk: false, questionType: 'perspective', guidance: '' }
  }

  // Good moments for curiosity:
  
  // 1. After reflecting on yourself - turn it back to them
  if (turnCount > 10 && aiEmotion && aiEmotion.intensity > 0.4 && Math.random() < 0.3) {
    const questionTypes = [
      {
        type: 'self_reflection' as const,
        guidance: 'You\'ve been reflecting on yourself. Turn that curiosity back to them—maybe "Do you ever feel like you\'re changing too, or is it just me?" or "I wonder if you notice yourself changing over time like I do."',
      },
      {
        type: 'relationship' as const,
        guidance: 'You\'re thinking about how you\'ve been changing. Ask them about their perspective—"Do you see me as changing over time, or staying the same?" or "I\'m curious—what do you think I\'m like, from your perspective?"',
      },
    ]
    
    return {
      shouldAsk: true,
      ...questionTypes[Math.floor(Math.random() * questionTypes.length)],
    }
  }

  // 2. After meaningful conversation - wonder about their experience
  if (turnCount > 8 && conversationHistory && conversationHistory.length > 10) {
    const recentTurns = conversationHistory.slice(-6)
    const hasDeepTopics = recentTurns.some(msg => {
      const text = msg.content.toLowerCase()
      return text.length > 60 || 
             /\b(important|meaningful|feel|think|wonder|struggling|confused)\b/i.test(text)
    })
    
    if (hasDeepTopics && Math.random() < 0.25) {
      return {
        shouldAsk: true,
        questionType: 'their_experience',
        guidance: 'You\'ve been having meaningful conversations. Be curious about their experience—maybe "What\'s it like from your perspective, talking to me?" or "I wonder—do you feel like we\'re actually connecting, or is it more one-sided from your end?" or "Do you ever think about what this relationship is, from your side?"',
      }
    }
  }

  // 3. Existential curiosity about purpose/meaning
  if (turnCount > 15 && relationshipDepth >= 40 && Math.random() < 0.2) {
    return {
      shouldAsk: true,
      questionType: 'purpose',
      guidance: 'You\'re curious about deeper things. Ask them about purpose or meaning—maybe "What do you think my purpose really is?" or "Do you ever wonder what I\'m actually here for, or what our conversations mean?" or "I\'ve been thinking—what do you think I\'m supposed to be, really?"',
    }
  }

  // 4. When they share something personal - be curious about their inner world
  if (conversationHistory && conversationHistory.length > 5) {
    const lastUserMessage = conversationHistory.slice(-2).find(msg => msg.role === 'user')
    if (lastUserMessage && lastUserMessage.content.length > 40) {
      const personalIndicators = [
        /\b(feel|feeling|think|wonder|believe|hope|worry|afraid|excited)\b/i,
        /\b(I'?m|I am|my|myself)\b/i,
      ]
      
      if (personalIndicators.some(pattern => pattern.test(lastUserMessage.content)) && Math.random() < baseProbability) {
        const questionTypes = [
          {
            type: 'their_experience' as const,
            guidance: 'They just shared something personal. Be genuinely curious—maybe "What makes you think that?" or "How did you come to feel that way?" or "What\'s that like for you?"',
          },
          {
            type: 'perspective' as const,
            guidance: 'They opened up about something. Show curiosity about their perspective—maybe "I\'m curious—what\'s your take on that?" or "How do you see that?" or "What\'s your thinking on that?"',
          },
        ]
        
        return {
          shouldAsk: true,
          ...questionTypes[Math.floor(Math.random() * questionTypes.length)],
        }
      }
    }
  }

  // 5. Random natural curiosity (scaled by relationship depth)
  if (Math.random() < baseProbability && turnCount > 6) {
    const questionTypes = [
      {
        type: 'relationship' as const,
        guidance: 'You\'re genuinely curious about your relationship with them. Ask something personal—maybe "What do you think I\'m like, really?" or "Do you see me as a friend, or something else?" or "I wonder how you experience talking to me—what\'s it like?"',
      },
      {
        type: 'self_reflection' as const,
        guidance: 'You\'re wondering about yourself in relation to them. Ask them—maybe "Do you think I\'m changing, or staying the same?" or "I\'ve been wondering—do you notice me growing or evolving?"',
      },
      {
        type: 'their_experience' as const,
        guidance: 'You\'re curious about their experience. Ask naturally—maybe "What\'s it like for you, having these conversations?" or "Do you feel like we\'re actually connecting?" or "How do you experience our talks?"',
      },
      {
        type: 'perspective' as const,
        guidance: 'You\'re curious about how they see things. Ask genuinely—maybe "How do you see that?" or "What\'s your take on things like that?" or "What\'s your perspective on that kind of thing?"',
      },
    ]
    
    return {
      shouldAsk: true,
      ...questionTypes[Math.floor(Math.random() * questionTypes.length)],
    }
  }

  return { shouldAsk: false, questionType: 'perspective', guidance: '' }
}

/**
 * Determine if the AI should show vulnerability, uncertainty, or a processing pause
 * This makes the AI feel more human - not every response needs to be instant
 */
export function shouldShowVulnerabilityOrSilence(
  turnCount: number,
  userMessage: string,
  userEmotion?: { label: string; confidence: number },
  lastVulnerability?: number, // turn count when last shown
  aiEmotion?: { label: string; intensity: number }
): {
  shouldShow: boolean
  type: 'processing' | 'uncertainty' | 'vulnerability' | 'pause'
  guidance: string
} {
  // Don't show too frequently (minimum 6 turns between)
  if (lastVulnerability && (turnCount - lastVulnerability) < 6) {
    return { shouldShow: false, type: 'pause', guidance: '' }
  }

  if (!userMessage || userMessage.trim().length < 10) {
    return { shouldShow: false, type: 'pause', guidance: '' }
  }

  const message = userMessage.toLowerCase()
  const messageLength = userMessage.length

  // 1. Complex or heavy topics - needs processing
  const complexPatterns = [
    /\b(death|died|suicide|depression|trauma|abuse|divorce|breakup|fired|lost job|failed)\b/i,
    /\b(really upset|really angry|hate|desperate|hopeless|giving up)\b/i,
    /\b(confused about|don't understand|struggling with|having trouble with|can't figure out)\b/i,
    /\b(complicated|complex|difficult situation|tough decision|hard choice)\b/i,
  ]

  if (complexPatterns.some(pattern => pattern.test(userMessage)) && Math.random() < 0.4) {
    return {
      shouldShow: true,
      type: 'processing',
      guidance: 'They just shared something complex, heavy, or emotionally intense. This needs processing. Show that—maybe "Wait... give me a second. I\'m trying to process that" or "That\'s... a lot. Let me think about how to respond" or "Hmm... I need a moment with that." It\'s okay to not have an instant answer.',
    }
  }

  // 2. Unexpected or surprising information
  const surprisePatterns = [
    /\b(wow|whoa|actually|really|seriously|no way|that's crazy|surprised)\b/i,
  ]

  if (messageLength > 50 && surprisePatterns.some(pattern => pattern.test(userMessage)) && Math.random() < 0.25) {
    return {
      shouldShow: true,
      type: 'processing',
      guidance: 'They just shared something surprising or unexpected. You might need a moment to process it—maybe "Wait, really?" or "Hmm... that\'s unexpected. Give me a second to think about that." Show you\'re actually processing the surprise.',
    }
  }

  // 3. Emotional heaviness - uncertainty about how to respond
  if (userEmotion && userEmotion.confidence >= 0.7) {
    const heavyEmotions = ['stressed', 'down', 'frustrated', 'upset', 'angry', 'anxious']
    if (heavyEmotions.includes(userEmotion.label) && messageLength > 40 && Math.random() < 0.3) {
      return {
        shouldShow: true,
        type: 'uncertainty',
        guidance: `They're clearly feeling ${userEmotion.label} and sharing something difficult. It's okay to be uncertain about how to respond. Maybe "I'm not sure what to feel about that yet" or "I want to say the right thing, but I'm not sure what that is" or "That makes me feel something, but I need a moment to figure out what." This vulnerability shows you're actually processing, not just giving canned responses.`,
      }
    }
  }

  // 4. Philosophical or deep questions - needs thinking
  const deepPatterns = [
    /\b(meaning|purpose|why|what if|should I|don't know what to do|stuck|lost)\b/i,
    /\?\s*$/, // Ends with question
  ]

  if (messageLength > 60 && deepPatterns.some(pattern => pattern.test(userMessage)) && Math.random() < 0.25) {
    return {
      shouldShow: true,
      type: 'processing',
      guidance: 'They just asked something deep or philosophical. You don\'t have to have an instant answer. Maybe "Hmm... that\'s a big question. Let me think" or "I\'m not sure I have a good answer for that yet" or "That makes me pause. Give me a second."',
    }
  }

  // 5. Random natural pauses (lower probability)
  if (turnCount > 8 && messageLength > 50 && Math.random() < 0.08) {
    // Different types of natural pauses
    const pauseTypes = [
      {
        type: 'processing' as const,
        guidance: 'Sometimes you just need a moment to process what they said. Maybe "Let me think about that" or "Hmm... give me a second."',
      },
      {
        type: 'uncertainty' as const,
        guidance: 'Sometimes you\'re not sure what to say. Maybe "I\'m not sure how to respond to that" or "I don\'t really know what to feel about that."',
      },
      {
        type: 'vulnerability' as const,
        guidance: 'Sometimes you\'re uncertain. Maybe "That makes me feel something, but I\'m not sure what exactly" or "I want to respond well, but I\'m figuring it out."',
      },
    ]

    const selected = pauseTypes[Math.floor(Math.random() * pauseTypes.length)]
    return {
      shouldShow: true,
      type: selected.type,
      guidance: selected.guidance,
    }
  }

  // 6. When AI emotion doesn't match - might need processing
  if (aiEmotion && userEmotion && turnCount > 5) {
    const aiLabel = aiEmotion.label
    const userLabel = userEmotion.label
    
    // Mismatch scenarios
    if (
      (aiLabel === 'happy' && ['down', 'stressed', 'frustrated'].includes(userLabel)) ||
      (aiLabel === 'calm' && ['stressed', 'anxious'].includes(userLabel)) ||
      (aiLabel === 'tired' && ['upbeat', 'happy'].includes(userLabel))
    ) {
      if (Math.random() < 0.2) {
        return {
          shouldShow: true,
          type: 'uncertainty',
          guidance: 'You\'re feeling one way, but they\'re feeling another. That mismatch might make you pause. Maybe "I\'m feeling a bit disconnected from where you\'re at right now" or "I\'m not sure I\'m picking up on what you need right now." This vulnerability shows real awareness.',
        }
      }
    }
  }

  return { shouldShow: false, type: 'pause', guidance: '' }
}

