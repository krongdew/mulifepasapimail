import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'


export async function GET(request: NextRequest) {
  try {
    // ดึงข้อมูลทั้งหมด ไม่มีการแบ่งหน้า
    const posts = await prisma.post.findMany({
      orderBy: {
        postDate: 'desc'
      }
    });

    // สร้างข้อมูล CSV
    const headers = ['ID', 'ชื่อโพสต์', 'ประเภท', 'วันที่', 'แก้ไขล่าสุด', 'สถานะ', 'อีเมลผู้รับผิดชอบ', 'ส่งอีเมลล่าสุด', 'URL'];
    
    const rows = posts.map(post => [
      post.postId,
      `"${post.title.replace(/"/g, '""')}"`, // ใส่เครื่องหมายคำพูดและ escape เครื่องหมายคำพูดในข้อความ
      post.postType,
      post.postDate ? new Date(post.postDate).toLocaleString() : '',
      post.postModified ? new Date(post.postModified).toLocaleString() : '',
      post.postStatus,
      post.responsibleEmail || '',
      post.lastReminder ? new Date(post.lastReminder).toLocaleString() : '',
      post.permalink
    ]);

    // รวมข้อมูลเป็นรูปแบบ CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // สร้าง response ในรูปแบบ CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="wordpress_posts.csv"'
      }
    });
  } catch (error) {
    console.error('Error exporting posts:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to export posts data'
    }, { status: 500 });
  }
}