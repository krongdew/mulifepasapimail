// app/api/delete-selected/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json()
    
    // ตรวจสอบว่ามี ids ส่งมาหรือไม่
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่มีรายการที่เลือกสำหรับลบ' 
      }, { status: 400 })
    }
    
    // ลบข้อมูลที่เลือก
    const deletedPosts = await prisma.post.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      count: deletedPosts.count,
      message: `ลบข้อมูลสำเร็จ ${deletedPosts.count} รายการ`
    })
  } catch (error) {
    console.error('Error deleting selected posts:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล' 
    }, { status: 500 })
  }
}