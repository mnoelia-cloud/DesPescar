import { FooterLayout } from '@/components/layout/FooterLayout';
import { MainLayout } from '@/components/layout/MainLayout';
import { PublicRoute } from '@/components/Routes/PublicRoute';
import { ProtectedRoute } from '@/components/Routes/ProtectedRoute';
import { MyDataPage } from '@/features/profile/pages/MyDataPage';
import { ReservationsLayout } from '@/features/reservations/layouts/ReservationsLayout';
import { CancelTripPage } from '@/features/reservations/pages/CancelTripPage';
import { FlightDetailsPage } from '@/features/reservations/pages/FlightDetailsPage';
import { ManageTripPage } from '@/features/reservations/pages/ManageTripPage';
import { MyReservationsPage } from '@/features/reservations/pages/MyReservationsPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { Baggage } from '@/features/bookings/pages/Baggage';
import { SeatSelection } from '@/features/bookings/pages/SeatSelection';
import { HomePage } from '@/features/flights/pages/HomePage';
import { ResultsPage } from '@/features/flights/pages/ResultsPage';
import { AdminLayout } from '@/components/admin';
import { generalNavItems } from '@/features/admin/general/general.nav';
import { GeneralDashboardPage } from '@/features/admin/general/pages/GeneralDashboardPage';
import { GeneralUsersPage } from '@/features/admin/general/pages/GeneralUsersPage';
import { airlineNavItems } from '@/features/admin/airline/airline.nav';
import { AirlineDashboardPage } from '@/features/admin/airline/dashboard/pages/AirlineDashboardPage';
import { AirlineBookingsPage } from '@/features/admin/airline/bookings/pages/AirlineBookingsPage';
import { AirlineFlightsPage } from '@/features/admin/airline/flights/pages/AirlineFlightsPage';
import { AirlineReportsPage } from '@/features/admin/airline/reports/pages/AirlineReportsPage';
import { hotelNavItems } from '@/features/admin/hotel/hotel.nav';
import { HotelDashboardPage } from '@/features/admin/hotel/dashboard/pages/HotelDashboardPage';
import { HotelManagementPage } from '@/features/admin/hotel/management/pages/HotelManagementPage';
import { HotelReportsPage } from '@/features/admin/hotel/reports/pages/HotelReportsPage';
import { HotelReservationsPage } from '@/features/admin/hotel/reservations/pages/HotelReservationsPage';
import { HotelDetailPage } from '@/features/hotels/pages/HotelDetailPage';
import { HotelResultsPage } from '@/features/hotels/pages/HotelResultsPage';
import { CarritoPage } from '@/features/cart/pages/CarritoPage';
import { GrupoInvitacionPage } from '@/features/grupo/pages/GrupoInvitacionPage';
import { PagoResultadoPage } from '@/features/payments/pages/PagoResultadoPage';
import { PagoSimuladoPage } from '@/features/payments/pages/PagoSimuladoPage';
import { PagoMercadoPagoPage } from '@/features/payments/pages/PagoMercadoPagoPage';
import { createBrowserRouter, Navigate } from 'react-router';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        element: <FooterLayout />,
        children: [
          {
            path: '/',
            element: <HomePage />,
          },
          {
            path: '/vuelos',
            element: <ResultsPage />,
          },
          {
            path: '/hoteles',
            element: <HotelResultsPage />,
          },
          {
            path: '/hoteles/:id',
            element: <HotelDetailPage />,
          },
        ],
      },
      {
        element: <PublicRoute />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/register',
            element: <RegisterPage />,
          },
        ],
      },
      {
        // Equipaje no necesita sesión: solo lee el vuelo elegido del store local.
        path: '/booking/baggage',
        element: <Baggage />,
      },
      {
        // Asientos reserva lugares a nombre del usuario (websocket autenticado): acá se pide
        // iniciar sesión y se vuelve con el vuelo todavía seleccionado.
        path: '/booking',
        element: <ProtectedRoute />,
        children: [
          {
            path: 'seats',
            element: <SeatSelection />,
          },
          {
            path: 'checkout',
            element: <Navigate to="/carrito" replace />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/carrito',
            element: <CarritoPage />,
          },
          {
            path: '/pago/simulado',
            element: <PagoSimuladoPage />,
          },
          {
            path: '/pago/mercadopago',
            element: <PagoMercadoPagoPage />,
          },
          {
            path: '/pago/resultado',
            element: <PagoResultadoPage />,
          },
          {
            path: '/grupo/:token',
            element: <GrupoInvitacionPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <FooterLayout />,
            children: [
              {
                element: <ReservationsLayout />,
                children: [
                  { path: '/my-data', element: <MyDataPage /> },
                  { path: '/settings', element: <SettingsPage /> },
                  {
                    path: '/my-reservations',
                    children: [
                      { index: true, element: <MyReservationsPage /> },
                      { path: ':id/manage', element: <ManageTripPage /> },
                      { path: ':id/details', element: <FlightDetailsPage /> },
                      { path: ':id/cancel', element: <CancelTripPage /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute allow={['SUPER_ADMIN']} />,
    children: [
      {
        element: <AdminLayout navItems={generalNavItems} />,
        children: [
          { index: true, element: <GeneralDashboardPage /> },
          { path: 'usuarios', element: <GeneralUsersPage /> },
        ],
      },
    ],
  },
  {
    path: '/admin/aerolinea',
    element: <ProtectedRoute allow={['AIRLINE_ADMIN']} />,
    children: [
      {
        element: <AdminLayout navItems={airlineNavItems} sidebarSubtitle="PANEL DE AEROLÍNEA" />,
        children: [
          { index: true, element: <AirlineDashboardPage /> },
          { path: 'vuelos', element: <AirlineFlightsPage /> },
          { path: 'reservas', element: <AirlineBookingsPage /> },
          { path: 'reportes', element: <AirlineReportsPage /> },
        ],
      },
    ],
  },
  {
    path: '/admin/hotel',
    element: <ProtectedRoute allow={['HOTEL_ADMIN']} />,
    children: [
      {
        element: <AdminLayout navItems={hotelNavItems} sidebarSubtitle="PANEL DE HOTEL" />,
        children: [
          { index: true, element: <HotelDashboardPage /> },
          { path: 'gestion', element: <HotelManagementPage /> },
          { path: 'reservas', element: <HotelReservationsPage /> },
          { path: 'reportes', element: <HotelReportsPage /> },
        ],
      },
    ],
  },
]);
