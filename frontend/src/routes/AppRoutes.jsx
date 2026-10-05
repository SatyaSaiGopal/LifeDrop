import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { LoadingState } from '../components/feedback/States';

import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';

// Route-level code splitting: the landing and auth pages are needed
// immediately; everything else loads on demand.
const SearchPage = lazy(() => import('../pages/SearchPage'));
const DonorProfilePage = lazy(() => import('../pages/DonorProfilePage'));
const RequestsPage = lazy(() => import('../pages/RequestsPage'));
const RequestDetailPage = lazy(() => import('../pages/RequestDetailPage'));
const CreateRequestPage = lazy(() => import('../pages/CreateRequestPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const CompatibilityPage = lazy(() => import('../pages/CompatibilityPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingState label="Loading…" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public */}
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="compatibility" element={<CompatibilityPage />} />
        <Route path="privacy" element={<PrivacyPage />} />

        <Route
          path="search"
          element={
            <Suspense fallback={<RouteFallback />}>
              <SearchPage />
            </Suspense>
          }
        />
        <Route
          path="donors/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DonorProfilePage />
            </Suspense>
          }
        />
        <Route
          path="requests"
          element={
            <Suspense fallback={<RouteFallback />}>
              <RequestsPage />
            </Suspense>
          }
        />
        <Route
          path="requests/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <RequestDetailPage />
            </Suspense>
          }
        />

        {/* Authenticated */}
        <Route
          path="requests/new"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteFallback />}>
                <CreateRequestPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteFallback />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute requireDonor>
              <Suspense fallback={<RouteFallback />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Aliases and 404 */}
        <Route path="donors" element={<Navigate to="/search" replace />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
