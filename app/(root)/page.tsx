import { startNewChat } from '@/features/home/actions/start-new-chat'
import { redirect } from 'next/navigation'
import React from 'react'

/**
 * Home page — creates a new chat and redirects to `/c/{id}`.
 */
const page = async() => {
  const { conversationId, branchId } = await startNewChat()

  redirect(`/c/${conversationId}?branch=${branchId}`)
}

export default page