import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import axios from 'axios'

// กำหนด interface สำหรับข้อมูลที่ได้จาก WordPress API
interface WordPressPost {
    id: number;
    title: {
      rendered: string;
    };
    link: string;
    date: string;
    modified: string;
    status: string;
  }
  

export async function POST() {
  try {
    const wpApiUrl = process.env.WP_API_URL
    
    // ดึงข้อมูลโพสต์ทั้งหมด
    const postsResponse = await axios.get(`${wpApiUrl}/posts`, {
      params: {
        per_page: 100,
        _fields: 'id,title,link,date,modified,status'
      }
    })
    
    const posts = postsResponse.data.map((post: WordPressPost) => ({
      postId: post.id,
      title: post.title.rendered,
      permalink: post.link,
      postType: 'post',
      postDate: new Date(post.date),
      postModified: new Date(post.modified),
      postStatus: post.status
    }))
    
    // ดึงข้อมูล FAQ (ถ้ามี)
    let faqs = []
    try {
      const faqResponse = await axios.get(`${wpApiUrl}/faq`, {
        params: {
          per_page: 100,
          _fields: 'id,title,link,date,modified,status'
        }
      })
      
      faqs = faqResponse.data.map((faq: WordPressPost) => ({
        postId: faq.id,
        title: faq.title.rendered,
        permalink: faq.link,
        postType: 'faq',
        postDate: new Date(faq.date),
        postModified: new Date(faq.modified),
        postStatus: faq.status
      }))
    } catch (error) {
      console.log('No FAQ found or error fetching FAQ:', (error as Error).message)
    }
    
    const allPosts = [...posts, ...faqs]
    
    // บันทึกข้อมูลลงฐานข้อมูล
    for (const post of allPosts) {
      await prisma.post.upsert({
        where: { postId: post.postId },
        update: {
          title: post.title,
          permalink: post.permalink,
          postDate: post.postDate,
          postModified: post.postModified,
          postStatus: post.postStatus
        },
        create: post
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Synchronized ${allPosts.length} posts`,
      count: allPosts.length
    })
  } catch (error) {
    console.error('Error syncing with WordPress:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync with WordPress' 
    }, { status: 500 })
  }
}