import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LocaleGuard } from './components/LocaleGuard'

const isStaticBuild = import.meta.env.MODE === 'static'
const Router = isStaticBuild ? HashRouter : BrowserRouter
const routerBasename = isStaticBuild ? '' : import.meta.env.BASE_URL

const HomePage = lazy(() =>
  import('@/routes/home/HomePage').then((m) => ({ default: m.HomePage })),
)
const ProxyToolkit = lazy(() =>
  import('@/routes/proxy-toolkit/ProxyToolkit').then((m) => ({ default: m.ProxyToolkit })),
)
const AwgQrGenerator = lazy(() =>
  import('@/routes/awg-qr-generator/AwgQrGenerator').then((m) => ({ default: m.AwgQrGenerator })),
)
const AwgConfigGenerator = lazy(() =>
  import('@/routes/awg-config-generator/AwgConfigGenerator').then((m) => ({
    default: m.AwgConfigGenerator,
  })),
)
const MihomoConfigGenerator = lazy(() =>
  import('@/routes/mihomo-config-generator/MihomoConfigGenerator').then((m) => ({
    default: m.MihomoConfigGenerator,
  })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <span className="animate-pulse">…</span>
    </div>
  )
}

function App() {
  return (
    <Router basename={routerBasename}>
      <Routes>
        <Route path="/" element={<Navigate to="/ru" replace />} />
        <Route path="/:locale" element={<LocaleGuard />}>
          <Route element={<Layout />}>
            <Route
              index
              element={
                <Suspense fallback={<RouteFallback />}>
                  <HomePage />
                </Suspense>
              }
            />
            <Route
              path="proxy-toolkit"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ProxyToolkit />
                </Suspense>
              }
            />
            <Route
              path="awg-qr-generator"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AwgQrGenerator />
                </Suspense>
              }
            />
            <Route
              path="awg-config-generator"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AwgConfigGenerator />
                </Suspense>
              }
            />
            <Route
              path="mihomo-config-generator"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MihomoConfigGenerator />
                </Suspense>
              }
            />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
