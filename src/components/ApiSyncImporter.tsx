// components/ApiSyncImporter.tsx
'use client'

import { useState } from 'react'

export default function ApiSyncImporter({ onImportComplete }: { onImportComplete: () => void }) {
  const [baseUrl, setBaseUrl] = useState('https://mustudent.mahidol.ac.th/wp-json/wp/v2/posts')
  const [perPage, setPerPage] = useState(100)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [importMode, setImportMode] = useState<'manual' | 'auto'>('manual')

  // ฟังก์ชันสำหรับตรวจสอบจำนวนหน้าทั้งหมด
  const checkTotalPages = async () => {
    try {
      setResult(null)
      const response = await fetch(`${baseUrl}?per_page=${perPage}&page=1`)
      
      // ดึงข้อมูลจำนวนหน้าจาก header
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0')
      const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0')
      
      setTotalPages(totalPages)
      setCurrentPage(0)
      
      setResult({ 
        success: true, 
        message: `พบข้อมูลทั้งหมด ${totalPosts} รายการ (${totalPages} หน้า)` 
      })
      
      return totalPages
    } catch (error) {
      console.error('Error checking total pages:', error)
      setResult({ 
        success: false, 
        message: `เกิดข้อผิดพลาดในการตรวจสอบข้อมูล: ${error instanceof Error ? error.message : String(error)}` 
      })
      return 0
    }
  }

  // ฟังก์ชันสำหรับนำเข้าข้อมูลจากหน้าที่ระบุ
  const importPage = async (page: number) => {
    try {
      // ดึงข้อมูลจาก WordPress API
      const fetchResponse = await fetch(`${baseUrl}?per_page=${perPage}&page=${page}&_embed=true`)
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`)
      }
      
      const posts = await fetchResponse.json()
      
      // ส่งข้อมูลไปยัง API ของเรา
      const importResponse = await fetch('/api/import-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(posts),
      })
      
      if (!importResponse.ok) {
        throw new Error(`Import error! status: ${importResponse.status}`)
      }
      
      const importResult = await importResponse.json()
      
      if (!importResult.success) {
        throw new Error(importResult.error || 'Unknown import error')
      }
      
      return importResult
    } catch (error) {
      console.error(`Error importing page ${page}:`, error)
      throw error
    }
  }

  // ฟังก์ชันสำหรับ import หน้าถัดไป (สำหรับการนำเข้าแบบ manual)
  const importNextPage = async () => {
    if (currentPage >= totalPages) {
      return { success: false, message: 'ไม่มีหน้าให้นำเข้าแล้ว' }
    }
    
    const nextPage = currentPage + 1
    setIsImporting(true)
    
    try {
      const result = await importPage(nextPage)
      setCurrentPage(nextPage)
      
      return {
        success: true,
        message: `นำเข้าหน้า ${nextPage}/${totalPages} สำเร็จ - สร้าง: ${result.results.created}, อัพเดต: ${result.results.updated}, ผิดพลาด: ${result.results.errors}`
      }
    } catch (error) {
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการนำเข้าหน้า ${nextPage}: ${error instanceof Error ? error.message : String(error)}`
      }
    } finally {
      setIsImporting(false)
      // เรียก callback เพื่ออัพเดตหน้าหลัก
      onImportComplete()
    }
  }

  // ฟังก์ชันสำหรับ import ทั้งหมด (auto)
  const importAllPages = async () => {
    // ตรวจสอบจำนวนหน้าอีกครั้ง
    const pages = await checkTotalPages()
    
    if (pages <= 0) {
      setResult({ success: false, message: 'ไม่พบข้อมูลที่จะนำเข้า' })
      return
    }
    
    setIsImporting(true)
    setImportProgress(0)
    setCurrentPage(0)
    
    let successPages = 0
    let failedPages = 0
    let totalCreated = 0
    let totalUpdated = 0
    let totalErrors = 0
    
    try {
      for (let page = 1; page <= pages; page++) {
        // อัพเดตความคืบหน้า
        setImportProgress((page - 1) / pages * 100)
        setCurrentPage(page - 1)
        
        try {
          const result = await importPage(page)
          
          // สะสมจำนวนข้อมูล
          totalCreated += result.results.created
          totalUpdated += result.results.updated
          totalErrors += result.results.errors
          
          successPages++
        } catch (error) {
          console.error(`Error importing page ${page}:`, error)
          failedPages++
        }
      }
      
      // นำเข้าเสร็จสิ้น
      setImportProgress(100)
      setCurrentPage(pages)
      
      setResult({
        success: true,
        message: `นำเข้าข้อมูลเสร็จสิ้น - สำเร็จ ${successPages} หน้า, ล้มเหลว ${failedPages} หน้า - สร้าง: ${totalCreated}, อัพเดต: ${totalUpdated}, ผิดพลาด: ${totalErrors}`
      })
    } catch (error) {
      setResult({
        success: false,
        message: `เกิดข้อผิดพลาดในการนำเข้า: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setIsImporting(false)
      // เรียก callback เพื่ออัพเดตหน้าหลัก
      onImportComplete()
    }
  }

  // ฟังก์ชันสำหรับจัดการการนำเข้า
  const handleImport = async () => {
    if (importMode === 'manual') {
      // ถ้ายังไม่เคยตรวจสอบจำนวนหน้า ให้ตรวจสอบก่อน
      if (totalPages === 0) {
        await checkTotalPages()
      } else {
        const result = await importNextPage()
        setResult(result)
      }
    } else {
      // นำเข้าทั้งหมด
      await importAllPages()
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">นำเข้าข้อมูลจาก WordPress API</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WordPress API URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="https://example.com/wp-json/wp/v2/posts"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            จำนวนต่อหน้า
          </label>
          <input
            type="number"
            value={perPage}
            onChange={(e) => setPerPage(parseInt(e.target.value) || 10)}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          โหมดการนำเข้า
        </label>
        <div className="flex gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={importMode === 'manual'}
              onChange={() => setImportMode('manual')}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <span className="ml-2">นำเข้าทีละหน้า</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={importMode === 'auto'}
              onChange={() => setImportMode('auto')}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <span className="ml-2">นำเข้าทั้งหมดอัตโนมัติ</span>
          </label>
        </div>
      </div>
      
      {totalPages > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              ความคืบหน้า: หน้า {currentPage}/{totalPages}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(currentPage / totalPages * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${(currentPage / totalPages) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={checkTotalPages}
          disabled={isImporting}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          ตรวจสอบข้อมูล
        </button>
        
        <button
          onClick={handleImport}
          disabled={isImporting || (importMode === 'manual' && (totalPages === 0 || currentPage >= totalPages))}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isImporting 
            ? (importMode === 'auto' ? `กำลังนำเข้า ${Math.round(importProgress)}%...` : `กำลังนำเข้าหน้า ${currentPage + 1}...`)
            : (importMode === 'auto' ? 'นำเข้าทั้งหมด' : (totalPages === 0 ? 'นำเข้าข้อมูล' : `นำเข้าหน้า ${currentPage + 1}/${totalPages}`))
          }
        </button>
      </div>

      {result && (
        <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result.message}
        </div>
      )}
    </div>
  )
}