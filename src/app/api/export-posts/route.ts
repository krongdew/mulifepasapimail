// app/api/export-posts/route.ts
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
    const headers = [
      'ID',
      'ชื่อโพสต์',
      'ประเภท',
      'วันที่',
      'แก้ไขล่าสุด',
      'สถานะ',
      'หมวดหมู่',
      'แท็ก',
      'อีเมลผู้รับผิดชอบ',
      'ส่งอีเมลล่าสุด',
      'URL'
    ];
    
    const rows = posts.map(post => {
      // แปลงข้อมูล JSON หมวดหมู่และแท็กกลับเป็น array แล้วรวมเป็นข้อความคั่นด้วย comma
      let categoriesText = '';
      let tagsText = '';
      
      try {
        if (post.categories) {
          const categoriesArray = JSON.parse(post.categories as string);
          categoriesText = categoriesArray.map((cat: string) => `"${cat.replace(/"/g, '""')}"`).join('; ');
        }
      } catch (err) {
        console.error('Error parsing categories for post', post.id, err);
      }
      
      try {
        if (post.tags) {
          const tagsArray = JSON.parse(post.tags as string);
          tagsText = tagsArray.map((tag: string) => `"${tag.replace(/"/g, '""')}"`).join('; ');
        }
      } catch (err) {
        console.error('Error parsing tags for post', post.id, err);
      }
      
      return [
        post.postId,
        `"${post.title.replace(/"/g, '""')}"`, // ใส่เครื่องหมายคำพูดและ escape เครื่องหมายคำพูดในข้อความ
        post.postType,
        post.postDate ? new Date(post.postDate).toLocaleString() : '',
        post.postModified ? new Date(post.postModified).toLocaleString() : '',
        post.postStatus,
        categoriesText ? `"${categoriesText}"` : '',   // เพิ่มหมวดหมู่
        tagsText ? `"${tagsText}"` : '',               // เพิ่มแท็ก
        post.responsibleEmail || '',
        post.lastReminder ? new Date(post.lastReminder).toLocaleString() : '',
        `"${post.permalink.replace(/"/g, '""')}"`      // URL ควรอยู่ในเครื่องหมายคำพูดเพื่อป้องกันปัญหากับเครื่องหมาย comma
      ];
    });
    
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