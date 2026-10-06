import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  PageHeader,
  SearchFilterBar,
  Select,
  DataTable,
  Badge,
  Pagination,
  Modal,
  AdminInput,
  type TableColumn,
  type BadgeTone,
} from '@/components/admin';
import {
  crearCuenta,
  listarUsuarios,
  type NuevaCuenta,
  type UsuarioPlataforma,
} from '@/features/admin/general/services/usuariosService';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

/**
 * Usuarios de la plataforma (identity-service, solo SUPER_ADMIN): lista las cuentas y permite crear
 * cuentas de aerolínea, hotel o administración general.
 */

const POR_PAGINA = 10;

const ROLES: Record<string, { etiqueta: string; tone: BadgeTone }> = {
  SUPER_ADMIN: { etiqueta: 'Admin general', tone: 'danger' },
  AIRLINE_ADMIN: { etiqueta: 'Aerolínea', tone: 'dark' },
  HOTEL_ADMIN: { etiqueta: 'Hotel', tone: 'info' },
  USER: { etiqueta: 'Cliente', tone: 'neutral' },
};

const CUENTA_VACIA: NuevaCuenta = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'AIRLINE_ADMIN',
};

export const GeneralUsersPage = () => {
  const [usuarios, setUsuarios] = useState<UsuarioPlataforma[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [page, setPage] = useState(1);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [cuenta, setCuenta] = useState<NuevaCuenta>(CUENTA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // La carga inicial no cambia estado de forma síncrona en el efecto (arranca en "cargando").
  useEffect(() => {
    let activo = true;
    listarUsuarios()
      .then((lista) => activo && setUsuarios(lista))
      .catch(
        (e) => activo && setError(getApiErrorMessage(e, 'No se pudieron cargar los usuarios.')),
      )
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  const recargar = async () => {
    setError(null);
    try {
      setUsuarios(await listarUsuarios());
    } catch (e) {
      setError(getApiErrorMessage(e, 'No se pudieron cargar los usuarios.'));
    }
  };

  const filtrados = useMemo(() => {
    const texto = search.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideRol = filtro === 'todos' || u.role === filtro;
      const coincideTexto =
        !texto ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto);
      return coincideRol && coincideTexto;
    });
  }, [usuarios, search, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice((page - 1) * POR_PAGINA, page * POR_PAGINA);

  const abrirModal = () => {
    setCuenta(CUENTA_VACIA);
    setErrorCuenta(null);
    setModalAbierto(true);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorCuenta(null);
    try {
      await crearCuenta(cuenta);
      setModalAbierto(false);
      setAviso(
        `Cuenta ${cuenta.email} creada. Ya puede iniciar sesión con su correo y contraseña.`,
      );
      await recargar();
    } catch (err) {
      const causa = (err as { cause?: unknown }).cause;
      setErrorCuenta(
        causa
          ? `${(err as Error).message}`
          : getApiErrorMessage(err, 'No se pudo crear la cuenta.'),
      );
    } finally {
      setGuardando(false);
    }
  };

  const columns: TableColumn<UsuarioPlataforma>[] = [
    {
      key: 'nombre',
      header: 'Cuenta',
      render: (u) => (
        <div className="flex flex-col">
          <span className="font-semibold">
            {u.firstName} {u.lastName}
          </span>
          <span className="text-xs text-[#44474E]">{u.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) => {
        const rol = ROLES[u.role] ?? { etiqueta: u.role, tone: 'neutral' as BadgeTone };
        return <Badge tone={rol.tone}>{rol.etiqueta}</Badge>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Cuentas de la plataforma y sus roles."
        actions={
          <button
            type="button"
            onClick={abrirModal}
            className="bg-secondary hover:bg-secondary/90 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva cuenta
          </button>
        }
      />

      {aviso && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {aviso}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o email..."
        >
          <Select
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value);
              setPage(1);
            }}
            containerClassName="w-full md:w-48"
          >
            <option value="todos">Todos los roles</option>
            <option value="SUPER_ADMIN">Admin general</option>
            <option value="AIRLINE_ADMIN">Aerolíneas</option>
            <option value="HOTEL_ADMIN">Hoteles</option>
            <option value="USER">Clientes</option>
          </Select>
        </SearchFilterBar>

        {error ? (
          <div className="flex flex-col items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p role="alert">{error}</p>
            <button
              type="button"
              onClick={() => void recargar()}
              className="cursor-pointer font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        ) : cargando ? (
          <p className="text-sm text-[#44474E]">Cargando usuarios…</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={visibles}
              keyExtractor={(u) => u.id}
              emptyMessage="No se encontraron cuentas con ese criterio."
            />
            <Pagination
              currentPage={page}
              totalPages={totalPaginas}
              onPageChange={setPage}
              totalItems={filtrados.length}
              itemsPerPage={POR_PAGINA}
              itemLabel="cuentas"
            />
          </>
        )}
      </div>

      <Modal
        open={modalAbierto}
        onClose={() => !guardando && setModalAbierto(false)}
        title="Nueva cuenta"
        description="Se crea con ese correo y contraseña y con el rol elegido."
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput
              contentLabel="Nombre"
              required
              minLength={2}
              maxLength={50}
              value={cuenta.firstName}
              onChange={(e) => setCuenta({ ...cuenta, firstName: e.target.value })}
            />
            <AdminInput
              contentLabel="Apellido"
              required
              minLength={2}
              maxLength={50}
              value={cuenta.lastName}
              onChange={(e) => setCuenta({ ...cuenta, lastName: e.target.value })}
            />
          </div>
          <AdminInput
            contentLabel="Correo"
            type="email"
            required
            autoComplete="off"
            value={cuenta.email}
            onChange={(e) => setCuenta({ ...cuenta, email: e.target.value })}
          />
          <AdminInput
            contentLabel="Contraseña (mínimo 6 caracteres)"
            type="password"
            required
            minLength={6}
            maxLength={100}
            autoComplete="new-password"
            value={cuenta.password}
            onChange={(e) => setCuenta({ ...cuenta, password: e.target.value })}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="rol-cuenta" className="font-semibold text-[#1A2B4C]">
              Rol
            </label>
            <Select
              id="rol-cuenta"
              value={cuenta.role}
              onChange={(e) =>
                setCuenta({ ...cuenta, role: e.target.value as NuevaCuenta['role'] })
              }
            >
              <option value="AIRLINE_ADMIN">Aerolínea</option>
              <option value="HOTEL_ADMIN">Hotel</option>
              <option value="SUPER_ADMIN">Admin general</option>
            </Select>
          </div>

          {errorCuenta && (
            <p role="alert" className="text-alert text-sm">
              {errorCuenta}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={guardando}
              onClick={() => setModalAbierto(false)}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#44474E]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="bg-secondary hover:bg-secondary/90 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {guardando ? 'Creando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
