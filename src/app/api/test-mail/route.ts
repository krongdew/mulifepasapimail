// app/api/test-mail/route.ts
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Test Account:', testAccount);
    
    // แสดงการตั้งค่าจากไฟล์ .env
    console.log('Email Config:', {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_SECURE,
      user: process.env.MAIL_USER?.substring(0, 3) + '***'
    });
    
    // สร้าง transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      },
      logger: true
    });
    
    // ตรวจสอบการเชื่อมต่อ
    const verification = await transporter.verify();
    console.log('Transporter Verification:', verification);
    
    // ส่งอีเมลทดสอบ
    const info = await transporter.sendMail({
      from: `"Test User" <${process.env.MAIL_FROM_EMAIL}>`,
      to: process.env.MAIL_USER, // ส่งถึงตัวเอง
      subject: "Test Email from Next.js App",
      text: "Hello world? This is a test email.",
      html: "<b>Hello world?</b> This is a test email.",
    });
    
    console.log('Message sent:', info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      previewURL: nodemailer.getTestMessageUrl(info)
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}