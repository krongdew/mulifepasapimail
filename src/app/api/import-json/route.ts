// // app/api/import-json/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import prisma from '../../../../lib/prisma'

// interface ImportedPost {
//     id: number;
//     title: {
//       rendered: string;
//     };
//     link: string;
//     date: string;
//     modified: string;
//     status: string;
//     type: string;
//     content: {
//       rendered: string;
//     };
//     _links?: {
//       'wp:action-edit'?: [{ href: string }];
//     };
//   }

// export async function POST(request: NextRequest) {
//   try {
//     const data = await request.json();
    
//     if (!data || !Array.isArray(data)) {
//       return NextResponse.json({ 
//         success: false, 
//         error: 'Invalid JSON data. Expected an array of posts.' 
//       }, { status: 400 });
//     }

//     // แปลงข้อมูลโพสต์ให้อยู่ในรูปแบบที่ต้องการ
//     const processedPosts = data.map((post: ImportedPost) => ({
//       postId: post.id,
//       title: post.title.rendered,
//       permalink: post.link,
//       postType: post.type || 'post',
//       postDate: post.date ? new Date(post.date) : null,
//       postModified: post.modified ? new Date(post.modified) : null,
//       postStatus: post.status || 'publish'
//     }));

//     // นำเข้าข้อมูลลงฐานข้อมูล
//     const results = {
//       created: 0,
//       updated: 0,
//       errors: 0
//     };

//     for (const post of processedPosts) {
//       try {
//         await prisma.post.upsert({
//           where: { postId: post.postId },
//           update: {
//             title: post.title,
//             permalink: post.permalink,
//             postDate: post.postDate,
//             postModified: post.postModified,
//             postStatus: post.postStatus,
//             postType: post.postType
//           },
//           create: post
//         });

//         // เช็คว่าเป็นการสร้างใหม่หรืออัพเดต
//         const existingPost = await prisma.post.findUnique({
//           where: { postId: post.postId }
//         });

//         if (existingPost) {
//           results.updated++;
//         } else {
//           results.created++;
//         }
//       } catch (error) {
//         console.error(`Error importing post ID ${post.postId}:`, error);
//         results.errors++;
//       }
//     }

//     return NextResponse.json({ 
//       success: true, 
//       message: `Import complete. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`,
//       results
//     });
//   } catch (error) {
//     console.error('Error importing JSON data:', error instanceof Error ? error.message : String(error));
//     return NextResponse.json({ 
//       success: false, 
//       error: 'Failed to import JSON data'
//     }, { status: 500 });
//   }
// }

// app/api/import-json/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

interface ImportedPost {
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
  // เพิ่มฟิลด์สำหรับเก็บข้อมูลที่เราเตรียมไว้จาก API Importer
  categoryNames?: string[];
  tagNames?: string[];
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
    const data = await request.json();
    
    const results = {
      created: 0,
      updated: 0,
      errors: 0
    };
    
    // แปลงข้อมูลโพสต์
    for (const post of data) {
      try {
        // ดึงข้อมูลหมวดหมู่และแท็ก
        let categoryNames: string[] = [];
        let tagNames: string[] = [];
        
        // ดึงข้อมูลหมวดหมู่และแท็กจากฟิลด์ที่เตรียมไว้ก่อน (จาก API Importer)
        if (post.categoryNames && Array.isArray(post.categoryNames)) {
          categoryNames = post.categoryNames;
        }
        // ดึงข้อมูลแท็กจากฟิลด์ที่เตรียมไว้ก่อน (จาก API Importer)
        if (post.tagNames && Array.isArray(post.tagNames)) {
          tagNames = post.tagNames;
        }
        // ถ้ายังไม่มีข้อมูล ให้ดึงจาก _embedded ตามเดิม
        else if (post._embedded && post._embedded['wp:term']) {
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
      message: `Import complete. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`,
      results
    });
  } catch (error) {
    console.error('Error importing JSON data:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to import JSON data'
    }, { status: 500 });
  }
}