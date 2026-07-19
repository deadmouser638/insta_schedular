import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { api } from '@/api/client'

interface Props {
  mode: 'feed' | 'story'
  onUpload: (url: string) => void
}

export function ImageUploader({ mode, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const validateAspectRatio = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const ratio = img.width / img.height
        if (mode === 'story') resolve(ratio <= 0.6)
        else resolve(ratio >= 0.8 && ratio <= 1.92)
      }
      img.src = URL.createObjectURL(file)
    })

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const valid = await validateAspectRatio(file)
    if (!valid) {
      alert(mode === 'story'
        ? 'Stories require a 9:16 vertical image'
        : 'Feed posts require an image between 1:1 and 1.91:1 ratio')
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const { data: { uploadUrl, publicUrl } } = await api.post('/uploads/presign', {
        filename: file.name,
        contentType: file.type,
      })

      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      onUpload(publicUrl)
    } finally {
      setUploading(false)
    }
  }, [mode, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1,
  })

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
      ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/30 bg-black/20'}`}>
      <input {...getInputProps()} />
      {preview ? (
        <img src={preview} className="max-h-64 mx-auto rounded-xl object-cover shadow-2xl" />
      ) : (
        <div className="py-8">
          <div className="text-5xl mb-4 opacity-70">🖼️</div>
          <p className="font-semibold text-lg text-white">{uploading ? 'Uploading securely to S3…' : 'Click or drop your media here'}</p>
          <p className="text-sm text-zinc-400 mt-2">
            {mode === 'story' ? 'Vertical 9:16 required' : 'Square or landscape, up to 1.91:1'}
          </p>
        </div>
      )}
    </div>
  )
}
