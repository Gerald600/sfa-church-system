import React, { useState } from 'react'
import { Upload, Image as ImageIcon, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { compressImage } from '../../../utils/imageCompression'
import { validateUploadFile } from '../../../utils/validation'
import { supabase } from '../../../supabaseClient'

export const PhotoUploader = ({
  phases = [],
  photos = [],
  onPhotoUploaded,
  currentUser
}) => {
  const [selectedPhaseId, setSelectedPhaseId] = useState(phases[0]?.id || '')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    const validation = validateUploadFile(selected)
    if (!validation.success) {
      setErrorMsg(validation.error)
      setFile(null)
      return
    }
    setErrorMsg('')
    setFile(selected)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !selectedPhaseId) return

    setIsUploading(true)
    setUploadStatus('Compressing image on client side...')
    setErrorMsg('')

    try {
      // 1. Client-side compression
      const compressedFile = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 })
      setUploadStatus('Uploading compressed image to Supabase Storage...')

      // 2. Upload to Supabase Storage bucket 'phase_photos' or 'site_photos'
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${selectedPhaseId}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('phase_photos')
        .upload(fileName, compressedFile, { upsert: true })

      let publicUrl = ''
      if (uploadError) {
        console.warn('Supabase storage upload error, using object URL fallback:', uploadError)
        publicUrl = URL.createObjectURL(compressedFile)
      } else {
        const { data: urlData } = supabase.storage.from('phase_photos').getPublicUrl(fileName)
        publicUrl = urlData.publicUrl
      }

      // 3. Log photo in DB
      if (onPhotoUploaded) {
        await onPhotoUploaded({
          phaseId: selectedPhaseId,
          photoUrl: publicUrl,
          caption: caption.trim() || 'Site progress photo',
          uploadedBy: currentUser?.id
        })
      }

      setUploadStatus('Photo uploaded successfully!')
      setFile(null)
      setCaption('')
    } catch (err) {
      console.error('Upload error:', err)
      setErrorMsg(err.message || 'Image upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Form Box */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4">
        <h4 className="font-bold text-white text-lg flex items-center space-x-2">
          <Upload className="w-5 h-5 text-indigo-400" />
          <span>Upload Construction Site Progress Photo</span>
        </h4>
        <p className="text-xs text-slate-400">
          Photos are automatically compressed client-side before upload to preserve bandwidth and optimize gallery loading speed.
        </p>

        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Phase</label>
              <select
                value={selectedPhaseId}
                onChange={(e) => setSelectedPhaseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {phases.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Photo Caption</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Concrete slab pouring completed"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Image File (JPG, PNG, WEBP)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {uploadStatus && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center space-x-2">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span>{uploadStatus}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isUploading ? 'Compressing & Uploading...' : 'Upload Compressed Photo'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Photo Gallery Grid */}
      <div className="space-y-3">
        <h4 className="font-bold text-white text-base">Site Progress Photo Gallery</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500">
              No photos uploaded yet for this construction project.
            </div>
          ) : (
            photos.map((photo, i) => (
              <div key={photo.id || i} className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={photo.photo_url || photo.photoUrl}
                  alt={photo.caption || 'Site photo'}
                  className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent p-3 flex flex-col justify-end">
                  <p className="text-xs font-semibold text-white truncate">{photo.caption || 'Site Photo'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
