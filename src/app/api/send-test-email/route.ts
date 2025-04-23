// app/api/send-test-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import nodemailer from 'nodemailer'
import { SentMessageInfo } from 'nodemailer'

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
    
    // ตรวจสอบการตั้งค่าอีเมล (ใช้ MAIL_APP_PASSWORD แทน MAIL_PASSWORD)
    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      throw new Error('MAIL_USER and MAIL_APP_PASSWORD must be defined in environment variables');
    }
    
    console.log('Email configuration:', {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_SECURE,
      user: process.env.MAIL_USER.substring(0, 3) + '***' // แสดงเฉพาะ 3 ตัวแรกเพื่อความปลอดภัย
    });
    
    // มีสองทางเลือกในการตั้งค่า transporter:
    
    // ทางเลือกที่ 1: ใช้ service 'gmail' โดยตรง (แนะนำ)
    const transporter = nodemailer.createTransport({
      service: 'gmail',  // ใช้ preset ของ Gmail
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD  // ต้องใช้ App Password ไม่ใช่รหัสผ่านปกติ
      }
    });
    
    // ทางเลือกที่ 2: ตั้งค่าโดยระบุ host และ port เอง (สำรอง)
    /*
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,  // ใช้พอร์ต 465 สำหรับ SSL
      secure: true,  // ใช้ SSL (true สำหรับพอร์ต 465, false สำหรับ 587)
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_APP_PASSWORD  // ต้องใช้ App Password ไม่ใช่รหัสผ่านปกติ
      },
      tls: {
        rejectUnauthorized: false  // สำหรับการแก้ปัญหาการเชื่อมต่อ SSL (ไม่แนะนำในสภาพแวดล้อมการผลิต)
      }
    });
    */
    
    console.log('Sending test email...');
    
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER;
    const siteName = process.env.SITE_NAME || 'MU Life Pass';
    
    // ส่งอีเมลทดสอบ
    // ตัวอย่างการตั้งค่าการส่งอีเมลที่เพิ่มความน่าเชื่อถือ
const info = await transporter.sendMail({
  from: {
    name: 'MU Life Pass Official', // ชื่อที่ชัดเจน
    address: process.env.MAIL_USER,
  },
  to: post.responsibleEmail,
  subject: `[สำคัญ] กรุณาตรวจสอบข้อมูลของหน่วยงานบนเว็บไซต์ MU Life Pass`,
  // เพิ่ม plain text version เสมอ
  text: `เรียน ผู้ประสานงานข้อมูลของหน่วยงาน

  สืบเนื่องจากหนังสือเลขที่ อว 78.014/1255-59 เรื่องขอความอนุเคราะห์รายชื่อผู้ให้ข้อมูลบริการของหน่วยงานบนเว็บไซต์ MU Life Pass
  นี่คือบทความข้อมูลบริการของหน่วยงาน ที่มีอยู่บนเว็บไซต์ MU Life Pass (mustudent.mahidol.ac.th)
  
  โพสต์: ${post.title}
  ลิงก์: ${post.permalink}
  
  โปรดตรวจสอบเนื้อหาในเว็บไซต์ ตามลิงก์ที่ส่งให้ หากมีการเปลี่ยนแปลงแก้ไข หรือต้องการปรับปรุงเพิ่มเติมบทความสามารถตอบกลับอีเมลนี้ 
  หรือหากมีข้อสงสัย สามารถโทร. 02 849 4657 (ครองขวัญ บัวยอม)
  
  หมายเหตุ: เพื่อให้แน่ใจว่าคุณจะได้รับอีเมลจากเราในอนาคต กรุณาเพิ่ม ${process.env.MAIL_USER} เข้าไปในสมุดที่อยู่ของคุณ
  
  ขอแสดงความนับถือ,
  MU Life Pass Team`,
  html: `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #003366; color: white; padding: 15px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">MU Life Pass - ข้อมูลสำคัญ</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>เรียน ผู้ประสานงานข้อมูลของหน่วยงาน,</p>
        
        <p>สืบเนื่องจากหนังสือเลขที่ <strong>อว 78.014/1255-59</strong> เรื่องขอความอนุเคราะห์รายชื่อผู้ให้ข้อมูลบริการของหน่วยงานบนเว็บไซต์ MU Life Pass
        นี่คือบทความข้อมูลบริการของหน่วยงาน ที่มีอยู่บนเว็บไซต์ MU Life Pass (mustudent.mahidol.ac.th)</p>
        
        <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
          <h2 style="margin-top: 0; color: #003366; font-size: 20px;">${post.title}</h2>
          <p><strong>ประเภท:</strong> ${post.postType || 'ไม่ระบุ'}</p>
          <p><strong>วันที่โพสต์:</strong> ${post.postDate ? new Date(post.postDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
          <p><strong>แก้ไขล่าสุด:</strong> ${post.postModified ? new Date(post.postModified).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
          
          <div style="margin-top: 15px; text-align: center;">
            <a href="${post.permalink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 3px; display: inline-block; margin-right: 10px;">ดูโพสต์</a>
            <a href="mailto:${process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER}?subject=แจ้งปรับปรุงข้อมูล: ${encodeURIComponent(post.title)}" style="padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 3px; display: inline-block;">แจ้งปรับปรุงข้อมูล</a>
          </div>
        </div>
        
        <p>โปรดตรวจสอบเนื้อหาในเว็บไซต์ ตามลิงก์ที่ส่งให้ หากมีการเปลี่ยนแปลงแก้ไข หรือต้องการปรับปรุงเพิ่มเติมบทความสามารถตอบกลับอีเมลนี้ 
        หรือหากมีข้อสงสัย สามารถโทร. <strong>02 849 4657</strong> (ครองขวัญ บัวยอม)</p>
        
        <p>ขอแสดงความนับถือ,<br>MU Life Pass Team</p>
      </div>
      
      <div style="background-color: #f6f6f6; padding: 15px; font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
        <p><strong>หมายเหตุสำคัญ:</strong> เพื่อให้แน่ใจว่าคุณจะได้รับอีเมลจากเราในอนาคต กรุณาเพิ่ม ${process.env.MAIL_USER} เข้าไปในสมุดที่อยู่ของคุณ</p>
        <p>หากคุณไม่ต้องการรับอีเมลนี้อีก กรุณาแจ้งให้เราทราบโดยตอบกลับอีเมลนี้ด้วยหัวข้อ "ยกเลิกการรับอีเมล"</p>
        <p>© ${new Date().getFullYear()} MU Life Pass. All rights reserved.</p>
      </div>
    </div>
  `,
  headers: {
    'List-Unsubscribe': `<mailto:${process.env.MAIL_USER}?subject=Unsubscribe>`,
    'Precedence': 'bulk',
    'X-Mailer': 'MU Life Pass Notification System',
    'X-Auto-Response-Suppress': 'OOF, AutoReply',
    'Auto-Submitted': 'auto-generated',
    'X-Priority': '3'
  }
}) as SentMessageInfo;
    
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