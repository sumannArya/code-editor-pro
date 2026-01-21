"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export const updateUsername = async (username: string) => {
  try {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const existingUser = await db.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return { error: "Username already taken" }
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { username },
    })

    return { success: "Username updated" }
  } catch (error) {
    return { error: "Failed to update username" }
  }
}

export const searchUsers = async (query: string) => {
  try {
    const session = await auth()
    if (!session?.user?.id) return []

    if (query.length < 3) return []

    const users = await db.user.findMany({
      where: {
        username: {
            contains: query,
            mode: "insensitive"
        },
        NOT: {
          id: session.user.id
        }
      },
      select: {
        id: true,
        username: true,
        image: true,
        name: true
      },
      take: 5
    })

    return users
  } catch (error) {
    return []
  }
}

export const sendFriendRequest = async (receiverId: string) => {
    try {
        const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    if (session.user.id === receiverId) return { error: "Cannot add yourself" }

    const existingRequest = await db.friendRequest.findUnique({
        where: {
            senderId_receiverId: {
                senderId: session.user.id,
                receiverId
            }
        }
    })

    if (existingRequest) {
        return { error: "Request already sent" }
    }

    const existingFriendship = await db.user.findFirst({
        where: {
            id: session.user.id,
            friendIDs: {
                has: receiverId
            }
        }
    })

    if (existingFriendship) {
        return { error: "Already friends" }
    }


    await db.friendRequest.create({
        data: {
            senderId: session.user.id,
            receiverId,
            status: "PENDING"
        }
    })

    revalidatePath("/")
    return { success: "Friend request sent" }

    } catch (error) {
        return { error: "Failed to send request" }
    }
}

export const getFriendRequests = async () => {
    try {
        const session = await auth()
    if (!session?.user?.id) return []

    const requests = await db.friendRequest.findMany({
        where: {
            receiverId: session.user.id,
            status: "PENDING"
        },
        include: {
            sender: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true
                }
            }
        }
    })

    return requests
    } catch (error) {
        return []
    }
}

export const acceptFriendRequest = async (requestId: string) => {
    try {
        const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const request = await db.friendRequest.findUnique({
        where: { id: requestId },
        include: { sender: true, receiver: true }
    })

    if (!request || request.receiverId !== session.user.id) {
        return { error: "Invalid request" }
    }

    // Transaction to update both users and the request
    await db.$transaction([
        db.friendRequest.update({
            where: { id: requestId },
            data: { status: "ACCEPTED" }
        }),
        db.user.update({
            where: { id: session.user.id },
            data: {
                friends: { connect: { id: request.senderId } }
            }
        }),
        db.user.update({
            where: { id: request.senderId },
            data: {
                friends: { connect: { id: session.user.id } }
            }
        })
    ])

    revalidatePath("/")
    return { success: "Friend request accepted" }
        
    } catch (error) {
        return { error: "Failed to accept request" }
    }
}


export const rejectFriendRequest = async (requestId: string) => {
    try {
        const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const request = await db.friendRequest.findUnique({
        where: { id: requestId }
    })

    if (!request || request.receiverId !== session.user.id) {
        return { error: "Invalid request" }
    }

    await db.friendRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" }
    })
    
     revalidatePath("/")
    return { success: "Friend request rejected" }

    } catch (error) {
        return { error: "Failed to reject request" }
    }
}

export const getFriends = async () => {
    try {
         const session = await auth()
    if (!session?.user?.id) return []

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
            friends: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true
                }
            }
        }
    })

    return user?.friends || []

    } catch (error) {
        return []
    }
}

