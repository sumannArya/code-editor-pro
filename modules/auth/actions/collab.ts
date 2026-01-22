"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export const sendCollabInvite = async (receiverId: string, playgroundId: string) => {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" }
    }

    if (!playgroundId) {
        return { error: "Playground ID is required" }
    }

    try {
        // user cannot invite themselves
        if (session.user.id === receiverId) {
            return { error: "Cannot invite yourself" }
        }

        // Check if invite already exists in PENDING state
        const existingInvite = await db.collabInvite.findFirst({
            where: {
                senderId: session.user.id,
                receiverId,
                playgroundId,
                status: "PENDING"
            }
        })

        if (existingInvite) {
            return { error: "Invite already pending" }
        }

        const invite = await db.collabInvite.upsert({
            where: {
                senderId_receiverId_playgroundId: {
                    senderId: session.user.id,
                    receiverId,
                    playgroundId
                }
            },
            update: {
                status: "PENDING"
            },
            create: {
                senderId: session.user.id,
                receiverId,
                playgroundId,
                status: "PENDING"
            }
        })

        return { success: "Invite sent!", invite }
    } catch (error: any) {
        console.error("Error sending collab invite:", error)
        return { error: error.message || "Failed to send invite" }
    }
}

export const getCollabInvites = async () => {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        return []
    }

    try {
        const invites = await db.collabInvite.findMany({
            where: {
                receiverId: session.user.id,
                status: "PENDING"
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })
        return invites
    } catch (error) {
        console.error("Error fetching collab invites:", error)
        return []
    }
}

export const respondToCollabInvite = async (inviteId: string, status: "ACCEPTED" | "REJECTED") => {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" }
    }

    try {
        const invite = await db.collabInvite.findUnique({
            where: { id: inviteId }
        })

        if (!invite) {
            return { error: "Invite not found" }
        }

        if (invite.receiverId !== session.user.id) {
            return { error: "Unauthorized" }
        }

        const updatedInvite = await db.collabInvite.update({
            where: { id: inviteId },
            data: { status }
        })

        if (status === "ACCEPTED") {
            return { success: true, playgroundId: invite.playgroundId }
        }

        return { success: true }
    } catch (error) {
        console.error("Error responding to invite:", error)
        return { error: "Failed to respond to invite" }
    }
}

