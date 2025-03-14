// app/api/delete-all/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // ลบข้อมูลทั้งหมด
    const deletedPosts = await prisma.post.deleteMany({})
    
    return NextResponse.json({
      success: true,
      count: deletedPosts.count,
      message: `ลบข้อมูลทั้งหมดสำเร็จ ${deletedPosts.count} รายการ`
    })
  } catch (error) {
    console.error('Error deleting all posts:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการลบข้อมูลทั้งหมด' 
    }, { status: 500 })
  }
}