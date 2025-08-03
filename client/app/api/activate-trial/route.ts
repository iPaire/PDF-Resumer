import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Calculăm data de expirare (7 zile de acum)
  const trialExpires = new Date()
  trialExpires.setDate(trialExpires.getDate() + 7)
  
  try {
    // Actualizăm utilizatorul
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        trialOffered: true, // Marcam că am oferit trial
        subscription: 'trial',
        trialExpires: trialExpires.toISOString()
      }
    })
    
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Failed to activate trial:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}