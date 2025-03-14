// components/JsonImporter.tsx
'use client'

import { useState } from 'react'

export default function JsonImporter({ onImportComplete }: { onImportComplete: () => void }) {
  const [jsonData, setJsonData] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleImport = async () => {
    if (!jsonData.trim()) {
      setResult({ success: false, message: 'Please enter JSON data' })
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      // พยายามแปลง JSON เพื่อตรวจสอบว่าถูกต้องหรือไม่
      let jsonObject
      try {
        jsonObject = JSON.parse(jsonData)
      } catch (error) {
        setResult({ success: false, message: 'Invalid JSON format' })
        setIsImporting(false)
        return
      }

      // ส่งข้อมูลไปยัง API
      const response = await fetch('/api/import-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData, // ส่ง JSON string ที่ผู้ใช้ป้อน
      })

      const data = await response.json()

      if (data.success) {
        setResult({ success: true, message: data.message })
        // เรียกฟังก์ชัน callback หลังจากนำเข้าสำเร็จ
        if (onImportComplete) onImportComplete()
      } else {
        setResult({ success: false, message: data.error || 'Import failed' })
      }
    } catch (error) {
      setResult({ success: false, message: 'An error occurred during import' })
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
    }
  }

  // ฟังก์ชันสำหรับอ่านไฟล์ JSON
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setJsonData(content)
    }
    reader.readAsText(file)
  }
  
  

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">นำเข้าข้อมูลจาก JSON</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          อัพโหลดไฟล์ JSON
        </label>
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-medium
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="jsonData" className="block text-sm font-medium text-gray-700 mb-2">
          หรือวางข้อมูล JSON ที่นี่
        </label>
        <textarea
          id="jsonData"
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          placeholder='[{"id": 1, "title": {"rendered": "Post Title"}, ...}]'
        />
      </div>

      <button
        onClick={handleImport}
        disabled={isImporting || !jsonData.trim()}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isImporting ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
      </button>

      {result && (
        <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result.message}
        </div>
      )}
    </div>
  )
}