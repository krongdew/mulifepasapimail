// app/api/sync-wordpress-all/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface SyncOptions {
  apiUrl?: string;
  perPage?: number;
  includeEmbedded?: boolean;
}

interface PageResult {
  page: number;
  success: boolean;
  created?: number;
  updated?: number;
  errors?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const options: SyncOptions = await request.json();
    
    // ตั้งค่าเริ่มต้น
    const apiUrl = options.apiUrl || 'https://mustudent.mahidol.ac.th/wp-json/wp/v2/posts';
    const perPage = options.perPage || 100;
    const includeEmbedded = options.includeEmbedded !== false; // เปิดใช้งานโดยค่าเริ่มต้น
    
    // ตรวจสอบข้อมูลทั้งหมดก่อน
    const checkUrl = `${apiUrl}?page=1&per_page=${perPage}`;
    
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!checkResponse.ok) {
      throw new Error(`WordPress API returned status: ${checkResponse.status}`);
    }
    
    // ดึงข้อมูล header เพื่อใช้ในการ pagination
    const totalPages = parseInt(checkResponse.headers.get('X-WP-TotalPages') || '0');
    const totalPosts = parseInt(checkResponse.headers.get('X-WP-Total') || '0');
    
    if (totalPages <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No posts found in WordPress API'
      }, { status: 400 });
    }
    
    // สร้างอาร์เรย์ของการเรียก API สำหรับทุกหน้า
    const syncRequests = [];
    
    for (let page = 1; page <= totalPages; page++) {
      syncRequests.push(
        fetch('/api/sync-wordpress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiUrl,
            page,
            perPage,
            includeEmbedded
          }),
        }).then(res => res.json())
      );
    }
    
    // ดำเนินการ sync ทีละหน้าแบบ sequential เพื่อหลีกเลี่ยงการ overload server
    const results = {
      pages: [] as PageResult[],
      totalCreated: 0,
      totalUpdated: 0,
      totalErrors: 0,
      totalPages,
      totalPosts
    };
    
    for (let i = 0; i < syncRequests.length; i++) {
      try {
        const pageResult = await syncRequests[i];
        
        // เก็บผลลัพธ์ของแต่ละหน้า
        results.pages.push({
          page: i + 1,
          success: pageResult.success,
          created: pageResult.results?.created || 0,
          updated: pageResult.results?.updated || 0,
          errors: pageResult.results?.errors || 0
        });
        
        // รวมจำนวนสถิติ
        if (pageResult.success) {
          results.totalCreated += pageResult.results?.created || 0;
          results.totalUpdated += pageResult.results?.updated || 0;
          results.totalErrors += pageResult.results?.errors || 0;
        }
      } catch (error) {
        console.error(`Error syncing page ${i + 1}:`, error);
        results.pages.push({
          page: i + 1,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete for all ${totalPages} pages. Created: ${results.totalCreated}, Updated: ${results.totalUpdated}, Errors: ${results.totalErrors}`,
      results
    });
  } catch (error) {
    console.error('Error syncing all from WordPress API:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      success: false, 
      error: `Failed to sync all from WordPress API: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}