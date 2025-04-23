// app/api/send-test-grouped-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }
    
    // ดึงข้อมูลโพสต์ที่มีอีเมลผู้รับผิดชอบเป็นอีเมลที่ระบุ
    const posts = await prisma.post.findMany({
      where: {
        responsibleEmail: email
      },
      take: 5 // จำกัดจำนวนโพสต์สำหรับการทดสอบ
    });
    
    if (posts.length === 0) {
      return NextResponse.json({ success: false, error: 'No posts found for this email' }, { status: 404 });
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });
    
    
    const postsHTML = posts.map(post =>`
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="margin-top: 0; color: #333;">${post.title}</h2>
          <p><strong>ประเภท:</strong> ${post.postType}</p>
          <p><strong>วันที่โพสต์:</strong> ${post.postDate ? new Date(post.postDate).toLocaleDateString() : 'ไม่ระบุ'}</p>
          <p><strong>แก้ไขล่าสุด:</strong> ${post.postModified ? new Date(post.postModified).toLocaleDateString() : 'ไม่ระบุ'}</p>
          <div style="margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #ccc;">
            ${(post as any).content ? (post as any).content.substring(0, 300) + ((post as any).content.length > 300 ? '...' : '') : 'คลิกลิงก์ด้านล่างเพื่อดูเนื้อหาเต็ม'}
          </div>
          <div style="margin-top: 15px;">
            <a href="${post.permalink}" style="padding: 5px 10px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 3px;">ดูโพสต์</a>
          </div>
        </div>
      `).join('');
    
    // ส่งอีเมลทดสอบ
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
      to: email,
      subject: `โปรดตรวจสอบข้อมูลของหน่วยงานบนเว็บไซต์ MU Life pass ${posts.length} รายการ`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1 style="color: #2c3e50;">โปรดตรวจสอบข้อมูลของหน่วยงานบนเว็บไซต์ MU Life pass</h1>
          <p>เรียน ผู้ประสานงานข้อมูลของหน่วยงานทุกท่าน</p>
          <p>สืบเนื่องจากหนังสือเลขที่ อว 78.014/1255-59 เรื่องขอความอนุเคราะห์รายชื่อผู้ให้ข้อมูลบริการของหน่วยงานบนเว็บไซต์ MU Life pass นี่คือรายชื่อบทความข้อมูลบริการของหน่วยงาน ที่มีอยู่บนเว็บไซต์ MU Life pass (mustudent.mahidol.ac.th)</p>
          
          <div style="margin: 20px 0;">
            ${postsHTML}
          </div>
          
          <p>โปรดตรวจสอบเนื้อหาในเว็บไซต์ ตาม link ที่ส่งให้ หากมีการเปลี่ยนแปลงแก้ไข หรือต้องการปรับปรุงเพิ่มเติมบทความสามารถตอบกลับอีเมลนี้</p>
          <p>หรือหากมีข้อสงสัย สามารถโทร. 02 849 4657 (ครองขวัญ บัวยอม) ค่ะ</p>
          
          <p>ขอแสดงความนับถือ,<br>${process.env.SITE_NAME}</p>
        </div>
      `
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email with ${posts.length} posts sent to ${email}`
    });
  } catch (error) {
    console.error('Error sending test grouped email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send test email'
    }, { status: 500 });
  }
}