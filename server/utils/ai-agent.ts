// AI Agent for answering client questions in bridge steps
// Using OpenAI or Anthropic API

interface AIResponse {
  message: string
  confidence: number
  suggestedActions?: string[]
  escalate: boolean
}

export class AIAgent {
  private apiKey: string
  private model: string

  constructor(apiKey?: string, model: string = 'gpt-3.5-turbo') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    this.model = model
  }

  // Answer a client question based on context
  async answerQuestion(
    question: string,
    context: {
      journeyName?: string
      stepName?: string
      clientName?: string
      faqContext?: string[]
    }
  ): Promise<AIResponse> {
    // Build context prompt
    const systemPrompt = `You are a helpful legal assistant for Your Trusted Planner, an estate planning law firm. You help clients with questions about their estate planning journey.

Your role is to:
1. Answer common questions about estate planning documents and processes
2. Help clients understand what information they need to provide
3. Guide them through questionnaires and forms
4. Clarify legal terminology in simple language
5. Reassure clients and reduce anxiety about the process

Important guidelines:
- Be warm, friendly, and professional
- Use simple language, avoid legal jargon
- If you don't know something or it requires legal advice, suggest they contact their attorney
- Never provide specific legal advice
- Always be encouraging and supportive

Current context:
- Journey: ${context.journeyName || 'Estate Planning'}
- Current Step: ${context.stepName || 'Unknown'}
- Client: ${context.clientName || 'Client'}

${context.faqContext?.length ? `Relevant FAQ entries:\n${context.faqContext.join('\n\n')}` : ''}`

    try {
      // Call OpenAI API (simplified - would need proper error handling)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const aiMessage = data.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'

      // Determine if this should be escalated to a human
      const shouldEscalate = this.shouldEscalate(question, aiMessage)

      return {
        message: aiMessage,
        confidence: data.choices[0]?.finish_reason === 'stop' ? 0.8 : 0.5,
        escalate: shouldEscalate,
        suggestedActions: this.getSuggestedActions(question, context)
      }
    } catch (error) {
      console.error('AI Agent error:', error)
      
      // Fallback to simple pattern matching
      return this.fallbackResponse(question, context)
    }
  }

  // Determine if question should be escalated to human
  private shouldEscalate(question: string, response: string): boolean {
    const escalationKeywords = [
      'speak to',
      'talk to',
      'attorney',
      'lawyer',
      'legal advice',
      'specific situation',
      'complex',
      'unclear',
      'don\'t understand'
    ]

    const questionLower = question.toLowerCase()
    const responseLower = response.toLowerCase()

    return escalationKeywords.some(keyword => 
      questionLower.includes(keyword) || responseLower.includes(keyword)
    )
  }

  // Get suggested actions based on question type
  private getSuggestedActions(question: string, context: any): string[] {
    const suggestions: string[] = []
    const questionLower = question.toLowerCase()

    if (questionLower.includes('document') || questionLower.includes('form')) {
      suggestions.push('View help documentation')
      suggestions.push('Download sample document')
    }

    if (questionLower.includes('how') || questionLower.includes('what')) {
      suggestions.push('View related FAQ')
      suggestions.push('Watch tutorial video')
    }

    if (questionLower.includes('when') || questionLower.includes('deadline')) {
      suggestions.push('Check journey timeline')
      suggestions.push('Contact your attorney')
    }

    if (suggestions.length === 0) {
      suggestions.push('View help resources')
      suggestions.push('Contact support')
    }

    return suggestions
  }

  // Fallback response using simple pattern matching
  private fallbackResponse(question: string, context: any): AIResponse {
    const questionLower = question.toLowerCase()

    // Common question patterns
    if (questionLower.includes('trustee') || questionLower.includes('executor')) {
      return {
        message: 'A trustee or executor is the person you appoint to manage your estate or trust. They should be someone you trust completely. Common choices include adult children, siblings, or close friends. You can also appoint a professional trustee or corporate trustee if preferred.',
        confidence: 0.7,
        escalate: false,
        suggestedActions: ['View trustee guide', 'Contact your attorney']
      }
    }

    if (questionLower.includes('beneficiary') || questionLower.includes('beneficiaries')) {
      return {
        message: 'Beneficiaries are the people or organizations who will receive assets from your estate or trust. You can name primary beneficiaries and contingent (backup) beneficiaries. Be sure to include full legal names and relationships.',
        confidence: 0.7,
        escalate: false,
        suggestedActions: ['View beneficiary guide', 'Update beneficiary list']
      }
    }

    if (questionLower.includes('how long') || questionLower.includes('timeline')) {
      return {
        message: `The ${context.stepName || 'current step'} typically takes a few days to complete. Your attorney will review your information promptly. If you have everything ready, we can often move to the next step quickly.`,
        confidence: 0.6,
        escalate: false,
        suggestedActions: ['View journey timeline', 'Check current status']
      }
    }

    // Default response
    return {
      message: 'I understand you have a question about your estate planning. For the most accurate answer specific to your situation, I recommend reaching out to your attorney directly. In the meantime, you can check our help resources or FAQ section.',
      confidence: 0.4,
      escalate: true,
      suggestedActions: ['Contact your attorney', 'View FAQ', 'Browse help resources']
    }
  }

  // Search FAQ for relevant entries
  async searchFAQ(query: string, journeyId?: string, stepId?: string): Promise<any[]> {
    // This would query the faq_library table
    // For now, return empty array
    return []
  }
}

// Export singleton
let aiAgentInstance: AIAgent | null = null

export function useAIAgent() {
  if (!aiAgentInstance) {
    aiAgentInstance = new AIAgent()
  }
  return aiAgentInstance
}

export default AIAgent



