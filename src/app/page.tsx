// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Post } from '@prisma/client'
import JsonImporter from '@/components/JsonImporter'
import ApiSyncImporter from '@/components/ApiSyncImporter' // เพิ่ม import component ใหม่

// กำหนด interface สำหรับผลลัพธ์การส่งอีเมล
interface EmailSendResult {
  email: string;
  sent: boolean;
  count: number;
}

export default function Home() {
 const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])
  
  // สำหรับการค้นหาและกรอง
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // สำหรับ pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPosts, setTotalPosts] = useState(0)
  const [isSending, setIsSending] = useState(false)
  
  // เพิ่มสถานะสำหรับดูว่าจะแสดง importer ประเภทไหน
  const [activeImporter, setActiveImporter] = useState<'json' | 'api'>('json')

  useEffect(() => {
    fetchPosts()
  }, [currentPage, itemsPerPage, searchTerm, sortOrder])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/posts?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&sort=${sortOrder}`
      )
      const data = await response.json()
      setPosts(data.posts)
      setTotalPosts(data.total)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportComplete = () => {
    fetchPosts()
  }

  const handleDeleteSelected = async () => {
    if (selectedPosts.length === 0) return;
    
    if (confirm(`คุณต้องการลบโพสต์ที่เลือก ${selectedPosts.length} รายการหรือไม่?`)) {
      try {
        const response = await fetch('/api/delete-selected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: selectedPosts }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          alert(`ลบข้อมูลสำเร็จ: ${data.count} รายการ`)
          setSelectedPosts([])
          fetchPosts()
        } else {
          alert(`เกิดข้อผิดพลาด: ${data.error}`)
        }
      } catch (error) {
        console.error('Error deleting posts:', error)
        alert('เกิดข้อผิดพลาดในการลบข้อมูล')
      }
    }
  }

  const handleDeleteAll = async () => {
    if (confirm('คุณต้องการลบข้อมูลทั้งหมดหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      try {
        const response = await fetch('/api/delete-all', {
          method: 'POST',
        })
        
        const data = await response.json()
        
        if (data.success) {
          alert(`ลบข้อมูลทั้งหมดสำเร็จ: ${data.count} รายการ`)
          setSelectedPosts([])
          fetchPosts()
        } else {
          alert(`เกิดข้อผิดพลาด: ${data.error}`)
        }
      } catch (error) {
        console.error('Error deleting all posts:', error)
        alert('เกิดข้อผิดพลาดในการลบข้อมูล')
      }
    }
  }

  const handleSaveEmail = async (postId: number, email: string) => {
    try {
      const response = await fetch('/api/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId, email }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Error saving email:', error)
      return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกอีเมล' }
    }
  }

  const handleSendTestEmail = async (postId: number) => {
    try {
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('ส่งอีเมลทดสอบสำเร็จ')
        return true
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`)
        return false
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      alert('เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ')
      return false
    }
  }
  
  // ย้ายฟังก์ชันนี้มาที่คอมโพเนนต์หลัก
  const handleSendGroupedEmails = async () => {
    if (confirm('คุณต้องการส่งอีเมลแจ้งเตือนแบบรวมสำหรับผู้รับผิดชอบทุกคนหรือไม่?')) {
      try {
        setIsSending(true);
        const response = await fetch('/api/send-reminder-emails', {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          // กำหนดประเภทข้อมูลให้กับ r
          alert(`ส่งอีเมลแจ้งเตือนสำเร็จไปยัง ${data.results.filter((r: EmailSendResult) => r.sent).length} อีเมล`);
          fetchPosts(); // ตอนนี้สามารถเรียกได้เพราะอยู่ใน scope เดียวกัน
        } else {
          alert(`เกิดข้อผิดพลาด: ${data.error}`);
        }
      } catch (error) {
        console.error('Error sending grouped emails:', error);
        alert('เกิดข้อผิดพลาดในการส่งอีเมล');
      } finally {
        setIsSending(false);
      }
    }
  };

  // คำนวณจำนวนหน้าทั้งหมด
  const totalPages = Math.ceil(totalPosts / itemsPerPage)

  // รายการตัวเลือกจำนวนต่อหน้า
  const perPageOptions = [10, 25, 50, 100]

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        ระบบจัดการอีเมลผู้รับผิดชอบโพสต์
      </h1>

       {/* ส่วนของแท็บเลือกประเภทการนำเข้า */}
       <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 ${activeImporter === 'json' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveImporter('json')}
        >
          นำเข้าจาก JSON
        </button>
        <button
          className={`py-2 px-4 ${activeImporter === 'api' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveImporter('api')}
        >
          นำเข้าจาก WordPress API
        </button>
      </div>
{/* แสดง component ตามแท็บที่เลือก */}
{activeImporter === 'json' ? (
        <JsonImporter onImportComplete={handleImportComplete} />
      ) : (
        <ApiSyncImporter onImportComplete={handleImportComplete} />
      )}


      <div className="bg-white shadow-md rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">รายการโพสต์ทั้งหมด</h2>
          <div>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded">
              {totalPosts} รายการ
            </span>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded">
              {selectedPosts.length} รายการที่เลือก
            </span>
          </div>
        </div>
        

        {/* ตัวกรองและการค้นหา */}
        <div className="p-4 bg-gray-50 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
            <input
              type="text"
              id="search"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="ค้นหาตามชื่อโพสต์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">เรียงลำดับ</label>
            <select
              id="sort"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="desc">ล่าสุดก่อน</option>
              <option value="asc">เก่าสุดก่อน</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="perPage" className="block text-sm font-medium text-gray-700 mb-1">แสดงต่อหน้า</label>
            <select
              id="perPage"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1) // รีเซ็ตหน้าเป็นหน้าแรกเมื่อเปลี่ยนจำนวนต่อหน้า
              }}
            >
              {perPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4 flex gap-2">
            {/* เพิ่มปุ่มส่งอีเมลรวมตรงนี้ */}
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleSendGroupedEmails}
              disabled={isSending}
            >
              {isSending ? 'กำลังส่งอีเมล...' : 'ส่งอีเมลแจ้งเตือนแบบรวม'}
            </button>
            
            <button 
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
              disabled={selectedPosts.length === 0}
              onClick={handleDeleteSelected}
            >
              ลบรายการที่เลือก
            </button>
            <button 
              className="bg-red-100 text-red-800 hover:bg-red-200 font-bold py-2 px-4 rounded"
              onClick={handleDeleteAll}
            >
              ลบข้อมูลทั้งหมด
            </button>
            
           {/* ปุ่มส่งออกข้อมูล */}
  <a 
    href="/api/export-posts" 
    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
    download
  >
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
    ส่งออกข้อมูล CSV
  </a>
</div>

          {/* แสดงตารางข้อมูล */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPosts(posts.map(post => post.id))
                          } else {
                            setSelectedPosts([])
                          }
                        }}
                        checked={selectedPosts.length === posts.length && posts.length > 0}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      โพสต์
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      อีเมลผู้รับผิดชอบ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      แก้ไขล่าสุด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ส่งอีเมลล่าสุด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map(post => (
                    <PostRow 
                      key={post.id}
                      post={post}
                      isSelected={selectedPosts.includes(post.id)}
                      onSelect={() => {
                        if (selectedPosts.includes(post.id)) {
                          setSelectedPosts(selectedPosts.filter(id => id !== post.id))
                        } else {
                          setSelectedPosts([...selectedPosts, post.id])
                        }
                      }}
                      onSaveEmail={handleSaveEmail}
                      onSendTestEmail={handleSendTestEmail}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                แสดง{' '}
                <span className="font-medium">{totalPosts === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>
                {' '}ถึง{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalPosts)}
                </span>
                {' '}จาก{' '}
                <span className="font-medium">{totalPosts}</span>
                {' '}รายการ
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                &lsaquo;
              </button>
              
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                &rsaquo;
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                &raquo;
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// Component แสดงแถวในตาราง
interface PostRowProps {
  post: Post
  isSelected: boolean
  onSelect: () => void
  onSaveEmail: (postId: number, email: string) => Promise<{ success: boolean, error?: string }>
  onSendTestEmail: (postId: number) => Promise<boolean>
}

function PostRow({ post, isSelected, onSelect, onSaveEmail, onSendTestEmail }: PostRowProps) {
  const [email, setEmail] = useState(post.responsibleEmail || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean, message?: string } | null>(null)
  const [isSending, setIsSending] = useState(false)
  
  // แปลง JSON string เป็น array
  const categories = post.categories ? JSON.parse(post.categories as string) : [];
  const tags = post.tags ? JSON.parse(post.tags as string) : [];

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    
    const result = await onSaveEmail(post.id, email)
    
    if (result.success) {
      setSaveStatus({ success: true, message: 'บันทึกสำเร็จ' })
    } else {
      setSaveStatus({ success: false, message: result.error || 'เกิดข้อผิดพลาด' })
    }
    
    setIsSaving(false)
    
    // ซ่อนข้อความสถานะหลังจาก 3 วินาที
    setTimeout(() => {
      setSaveStatus(null)
    }, 3000)
  }

  const handleSendTest = async () => {
    if (!email) {
      alert('กรุณากรอกอีเมลผู้รับผิดชอบก่อน')
      return
    }
    
    setIsSending(true)
    await onSendTestEmail(post.id)
    setIsSending(false)
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <input 
          type="checkbox" 
          className="h-4 w-4"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>
      <td className="px-6 py-4 w-1/3">
        <div className="flex items-start">
          <span className="bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded whitespace-nowrap mt-1">
            {post.postType}
          </span>
          <a 
            href={post.permalink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-900 line-clamp-2 break-words"
            style={{ maxWidth: '500px' }}
            title={post.title} // แสดงชื่อเต็มเมื่อ hover
          >
            {post.title}
          </a>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {categories.map((category: string, index: number) => (
            <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {category}
            </span>
          ))}
          {categories.length === 0 && (
            <span className="text-gray-400 text-xs">ไม่มีหมวดหมู่</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag: string, index: number) => (
            <span key={index} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-gray-400 text-xs">ไม่มีแท็ก</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <input 
            type="email" 
            className="border rounded p-1 text-sm mr-2" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="กรอกอีเมลผู้รับผิดชอบ"
          />
          <button 
            className={`text-xs font-medium px-2.5 py-1 rounded ${isSaving ? 'bg-gray-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
        {saveStatus && (
          <div className={`mt-1 text-xs ${saveStatus.success ? 'text-green-600' : 'text-red-600'}`}>
            {saveStatus.message}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {post.postDate ? new Date(post.postDate).toLocaleString() : 'ไม่ระบุ'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {post.postModified ? new Date(post.postModified).toLocaleString() : 'ไม่ระบุ'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {post.postStatus === 'publish' && (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">เผยแพร่</span>
        )}
        {post.postStatus === 'draft' && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">ร่าง</span>
        )}
        {post.postStatus === 'pending' && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">รออนุมัติ</span>
        )}
        {!['publish', 'draft', 'pending'].includes(post.postStatus || '') && (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">{post.postStatus}</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {post.lastReminder ? new Date(post.lastReminder).toLocaleString() : 'ยังไม่เคยส่ง'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button 
          className={`text-xs font-medium px-2.5 py-1 rounded ${!email || isSending ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
          disabled={!email || isSending}
          onClick={handleSendTest}
        >
          {isSending ? 'กำลังส่ง...' : 'ทดสอบส่งอีเมล'}
        </button>
      </td>
    </tr>
  )
}