// app/api/send-test-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import nodemailer from 'nodemailer'


export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json()
    
    if (!postId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
      }, { status: 400 })
    }
    
    // ดึงข้อมูลโพสต์
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })
    
    if (!post) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post not found' 
      }, { status: 404 })
    }
    
    if (!post.responsibleEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'No responsible email set for this post' 
      }, { status: 400 })
    }
    
    console.log('Preparing to send email to:', post.responsibleEmail);
    console.log('Email configuration:', {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_SECURE,
      user: process.env.MAIL_USER?.substring(0, 3) + '***' // แสดงเฉพาะ 3 ตัวแรกเพื่อความปลอดภัย
    });
    
    // สร้าง transporter สำหรับส่งอีเมล
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      },
      // เพิ่มบรรทัดนี้สำหรับการดีบัก
      logger: true,
      debug: true // แสดงข้อมูลการดีบัก (ให้ปิดในโหมดการผลิต)
    })
    
    console.log('Sending test email...');
    
    // ส่งอีเมลทดสอบ
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
      to: post.responsibleEmail,
      subject: `[ทดสอบ] แจ้งเตือนการอัพเดทเนื้อหา: ${post.title}`,
      html: `
        <p>เรียน ผู้รับผิดชอบ,</p>
        
        <p>นี่เป็นอีเมลทดสอบสำหรับระบบแจ้งเตือนการอัพเดทเนื้อหา</p>
        
        <p><strong>โพสต์:</strong> ${post.title}<br>
        <strong>ลิงก์:</strong> <a href="${post.permalink}">${post.permalink}</a></p>
        
        <p>ในอนาคต ระบบจะส่งอีเมลเตือนให้คุณตรวจสอบและอัพเดทเนื้อหาทุก 3 เดือน</p>
        
        <p>ขอบคุณ,<br>
        ${process.env.SITE_NAME}</p>
      `
    })
    
    console.log('Email sent successfully:', info.messageId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId
    })
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send test email'
    }, { status: 500 })
  }
}