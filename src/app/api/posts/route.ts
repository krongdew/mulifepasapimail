// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const page = parseInt(searchParams.get('page') || '1', 10)
      const limit = parseInt(searchParams.get('limit') || '10', 10)
      const search = searchParams.get('search') || ''
      const sort = searchParams.get('sort') || 'desc'
      
      // คำนวณ offset สำหรับ pagination
      const skip = (page - 1) * limit
  
      // เตรียมเงื่อนไขสำหรับการค้นหา
      const whereClause = search
        ? {
            title: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode
            }
          }
        : {}
  
      // ดึงข้อมูลโพสต์ตามเงื่อนไข
      const posts = await prisma.post.findMany({
        where: whereClause,
        orderBy: {
          postDate: sort === 'asc' ? 'asc' : 'desc'
        },
        skip,
        take: limit
      })
  
      // นับจำนวนโพสต์ทั้งหมดตามเงื่อนไขการค้นหา
      const total = await prisma.post.count({
        where: whereClause
      })
  
      return NextResponse.json({
        posts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      })
    } catch (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
  }