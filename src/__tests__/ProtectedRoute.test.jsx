import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import * as AuthContext from '../context/AuthContext'

vi.mock('../context/AuthContext')

describe('ProtectedRoute Component Permissions', () => {
  it('renders loading state when auth session is loading', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      role: null,
      loading: true
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText(/Loading session securely/i)).toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      role: null,
      loading: false
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('allows access when user role matches allowedRole', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'treasurer-1' },
      role: 'treasurer',
      loading: false
    })

    render(
      <MemoryRouter initialEntries={['/treasurer']}>
        <ProtectedRoute allowedRole="treasurer">
          <div>Treasurer Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Treasurer Dashboard')).toBeInTheDocument()
  })

  it('redirects user to their own role dashboard when accessing unauthorized role route', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'member-1' },
      role: 'member',
      loading: false
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/dashboard" element={<div>Member Dashboard</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <div>Admin Panel</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Member Dashboard')).toBeInTheDocument()
  })
})
