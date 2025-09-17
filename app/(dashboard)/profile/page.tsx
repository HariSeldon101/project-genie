'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Upload,
  Save,
  AlertCircle,
  CheckCircle,
  Camera,
  Loader2,
  Phone,
  MapPin
} from 'lucide-react'
import { persistentToast } from '@/lib/hooks/use-persistent-toast'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  phone?: string
  location?: string
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    full_name: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Removed direct Supabase client - using API endpoints instead

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)

      // Use API endpoint instead of direct database access
      const response = await fetch('/api/profile')

      if (!response.ok) {
        if (response.status === 401) {
          persistentToast.error('Not authenticated')
          return
        }
        throw new Error('Failed to load profile')
      }

      const profileData = await response.json()
      setProfile({
        id: profileData.id,
        email: profileData.email || '',
        full_name: profileData.full_name || '',
        avatar_url: profileData.avatar_url || '',
        phone: profileData.phone || '',
        location: profileData.location || ''
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      persistentToast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Use API endpoint instead of direct database access
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          location: profile.location
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save profile')
      }

      const updatedProfile = await response.json()
      setProfile({
        id: updatedProfile.id,
        email: updatedProfile.email || '',
        full_name: updatedProfile.full_name || '',
        avatar_url: updatedProfile.avatar_url || '',
        phone: updatedProfile.phone || '',
        location: updatedProfile.location || ''
      })

      persistentToast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      persistentToast.error(error.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        persistentToast.error('Please upload an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        persistentToast.error('Image must be less than 5MB')
        return
      }

      // Create Supabase client for storage operations only
      const supabaseStorage = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Create unique filename using profile ID
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabaseStorage.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        })

      if (uploadError) {
        // If bucket doesn't exist, try to create it
        if (uploadError.message?.includes('not found')) {
          const { error: createError } = await supabaseStorage.storage.createBucket('avatars', {
            public: true
          })

          if (!createError) {
            // Retry upload
            const { error: retryError } = await supabaseStorage.storage
              .from('avatars')
              .upload(filePath, file, {
                upsert: true,
                cacheControl: '3600'
              })

            if (retryError) throw retryError
          }
        } else {
          throw uploadError
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseStorage.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      
      // Auto-save the new avatar
      await handleSave()
      
      persistentToast.success('Avatar uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      persistentToast.error(error.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      <Separator />

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>
            Click on the avatar to upload a new photo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}>
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-lg">
                {profile.full_name ? getInitials(profile.full_name) : <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              disabled={uploading}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
          <div className="text-sm text-muted-foreground">
            <p>Recommended: Square image, at least 200x200px</p>
            <p>Maximum file size: 5MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">
                <User className="inline h-4 w-4 mr-2" />
                Full Name
              </Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-4 w-4 mr-2" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="inline h-4 w-4 mr-2" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="inline h-4 w-4 mr-2" />
                Location
              </Label>
              <Input
                id="location"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={loadProfile}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}