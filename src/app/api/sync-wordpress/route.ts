// app/api/sync-wordpress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

interface SyncOptions {
  apiUrl?: string;
  page?: number;
  perPage?: number;
  includeEmbedded?: boolean;
}

interface WordPressPost {
  id: number;
  title: {
    rendered: string;
  };
  link: string;
  date: string;
  modified: string;
  status: string;
  type: string;
  content: {
    rendered: string;
  };
  categories?: number[];
  tags?: number[];
  _embedded?: {
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      taxonomy: string;
    }>>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const options: SyncOptions = await request.json();
    
    // ตั้งค่าเริ่มต้น
    const apiUrl = options.apiUrl || 'https://mustudent.mahidol.ac.th/wp-json/wp/v2/posts';
    const page = options.page || 1;
    const perPage = options.perPage || 100;
    const includeEmbedded = options.includeEmbedded !== false; // เปิดใช้งานโดยค่าเริ่มต้น
    
    // สร้าง URL สำหรับการเรียก API
    const fetchUrl = `${apiUrl}?page=${page}&per_page=${perPage}${includeEmbedded ? '&_embed=true' : ''}`;
    
    // เรียกข้อมูลจาก WordPress API
    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API returned status: ${response.status}`);
    }
    
    // ดึงข้อมูล header เพื่อใช้ในการ pagination
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');
    const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0');
    
    // ดึงข้อมูลโพสต์
    const posts: WordPressPost[] = await response.json();
    
    // นำเข้าข้อมูลลงฐานข้อมูล
    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      page,
      totalPages,
      totalPosts
    };
    
    for (const post of posts) {
      try {
        // ดึงข้อมูลหมวดหมู่และแท็ก
        let categoryNames: string[] = [];
        let tagNames: string[] = [];
        
        // ถ้ามีข้อมูล _embedded ให้ดึงชื่อหมวดหมู่และแท็ก
        if (post._embedded && post._embedded['wp:term']) {
          post._embedded['wp:term'].forEach((termArray: Array<{id: number; name: string; taxonomy: string}>) => {
            termArray.forEach((term: {id: number; name: string; taxonomy: string}) => {
              if (term.taxonomy === 'category') {
                categoryNames.push(term.name);
              } else if (term.taxonomy === 'post_tag') {
                tagNames.push(term.name);
              }
            });
          });
        }
        
        // เช็คว่าเป็นการสร้างใหม่หรืออัพเดต
        const existingPost = await prisma.post.findUnique({
          where: { postId: post.id }
        });
        
        if (existingPost) {
          // อัปเดตโพสต์ที่มีอยู่แล้ว
          await prisma.post.update({
            where: { postId: post.id },
            data: {
              title: post.title.rendered,
              permalink: post.link,
              postDate: post.date ? new Date(post.date) : null,
              postModified: post.modified ? new Date(post.modified) : null,
              postStatus: post.status || 'publish',
              content: post.content?.rendered || null,
              categories: categoryNames.length > 0 ? JSON.stringify(categoryNames) : null,
              tags: tagNames.length > 0 ? JSON.stringify(tagNames) : null
            }
          });
          
          results.updated++;
        } else {
          // สร้างโพสต์ใหม่
          await prisma.post.create({
            data: {
              postId: post.id,
              title: post.title.rendered,
              permalink: post.link,
              postType: post.type || 'post',
              postDate: post.date ? new Date(post.date) : null,
              postModified: post.modified ? new Date(post.modified) : null,
              postStatus: post.status || 'publish',
              content: post.content?.rendered || null,
              categories: categoryNames.length > 0 ? JSON.stringify(categoryNames) : null,
              tags: tagNames.length > 0 ? JSON.stringify(tagNames) : null
            }
          });
          
          results.created++;
        }
      } catch (error) {
        console.error(`Error importing post ID ${post.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete for page ${page}/${totalPages}. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`,
      results
    });
  } catch (error) {
    console.error('Error syncing from WordPress API:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      success: false, 
      error: `Failed to sync from WordPress API: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

// สำหรับตรวจสอบจำนวนหน้าทั้งหมดโดยไม่นำเข้าข้อมูล
export async function GET(request: NextRequest) {
  try {
    // รับพารามิเตอร์จาก URL query
    const searchParams = request.nextUrl.searchParams;
    const apiUrl = searchParams.get('apiUrl') || 'https://mustudent.mahidol.ac.th/wp-json/wp/v2/posts';
    const perPage = parseInt(searchParams.get('perPage') || '100');
    
    // สร้าง URL สำหรับการเรียก API
    const fetchUrl = `${apiUrl}?page=1&per_page=${perPage}`;
    
    // เรียกข้อมูลจาก WordPress API
    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API returned status: ${response.status}`);
    }
    
    // ดึงข้อมูล header เพื่อใช้ในการ pagination
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');
    const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0');
    
    return NextResponse.json({ 
      success: true, 
      apiUrl,
      perPage,
      totalPages,
      totalPosts
    });
  } catch (error) {
    console.error('Error checking WordPress API:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      success: false, 
      error: `Failed to check WordPress API: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}