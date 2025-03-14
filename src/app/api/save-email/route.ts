// app/api/save-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { postId, email } = await request.json()
    
    if (!postId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
      }, { status: 400 })
    }
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email is required' 
      }, { status: 400 })
    }
    
    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid email format' 
      }, { status: 400 })
    }
    
    // อัพเดทอีเมลในฐานข้อมูล
    await prisma.post.update({
      where: { id: postId },
      data: { responsibleEmail: email }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Email saved successfully'
    })
  } catch (error) {
    console.error('Error saving email:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save email'
    }, { status: 500 })
  }
}