'use client'

import { useEffect, useState, useRef } from 'react'
import { QrCode, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'

interface QRCodeShareProps {
  url?: string
  title?: string
  size?: number
}

export default function QRCodeShare({ 
  url, 
  title = 'سوريا بلس (Syria Plus) خدمات',
  size = 200 
}: QRCodeShareProps) {
  const [currentUrl, setCurrentUrl] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setMounted(true)
    if (url) {
      setCurrentUrl(url)
    } else if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [url])

  useEffect(() => {
    if (mounted && currentUrl && showModal && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, currentUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          console.error('Error generating QR code:', error)
          toast.error('حدث خطأ أثناء إنشاء QR Code')
        } else {
          // Convert canvas to data URL for download
          const dataUrl = canvasRef.current?.toDataURL('image/png')
          if (dataUrl) {
            setQrDataUrl(dataUrl)
          }
        }
      })
    }
  }, [mounted, currentUrl, showModal, size])

  const downloadQR = () => {
    if (!qrDataUrl) {
      toast.error('QR Code غير جاهز للتحميل')
      return
    }

    try {
      const downloadLink = document.createElement('a')
      downloadLink.download = `qrcode-${title.replace(/\s+/g, '-')}.png`
      downloadLink.href = qrDataUrl
      downloadLink.click()
      toast.success('تم تحميل QR Code بنجاح!')
    } catch (error) {
      console.error('Error downloading QR code:', error)
      toast.error('حدث خطأ أثناء تحميل QR Code')
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* Button to open QR Code */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold"
        title="مشاركة عبر QR Code"
      >
        <QrCode className="w-4 h-4" />
        <span className="hidden sm:inline">QR Code</span>
      </button>

      {/* QR Code Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                {mounted && currentUrl ? (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto"
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 text-center break-all px-2">
                {currentUrl}
              </p>
              
              <div className="flex gap-2 w-full">
                <button
                  onClick={downloadQR}
                  disabled={!qrDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentUrl)
                    toast.success('تم نسخ الرابط!')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
                >
                  نسخ الرابط
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
