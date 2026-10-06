import { Search, Filter, UserPlus, Calendar, Phone } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { PATIENT_STATUS_LABELS, formatDateBR, getPatients, initials, type Patient, type PatientStatus } from "../api";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | PatientStatus>("all");
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // A busca é feita no servidor (o CPF chega mascarado na lista).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getPatients({
      search: debouncedSearch || undefined,
      status: filterStatus === "all" ? undefined : filterStatus,
      page,
    })
      .then((data) => {
        if (!active) return;
        setPatients(data.items);
        setTotal(data.total);
        setPageSize(data.pageSize);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os pacientes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [debouncedSearch, filterStatus, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de prontuários eletrônicos</p>
        </div>
        <Link
          to="/admission"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Novo Acolhimento
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF completo..."
              maxLength={150}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as "all" | PatientStatus);
                setPage(1);
              }}
              className="px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="ATIVO">Ativo</option>
              <option value="EM_CRISE">Em Crise</option>
              <option value="INATIVO">Inativo</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-input-background border border-input rounded-lg hover:bg-muted transition-all">
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Mostrando {patients.length} de {total} paciente(s)
        </div>
      </div>

      {isLoading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          Carregando pacientes...
        </div>
      )}

      {error && (
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {!isLoading && !error && patients.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            Nenhum paciente encontrado.
          </div>
        )}
        {patients.map((patient) => (
          <Link
            key={patient.id}
            to={`/patients/${patient.id}`}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/50 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg">
                  {initials(patient.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg">
                    {patient.fullName}
                    {patient.socialName && <span className="text-sm font-normal text-muted-foreground"> ({patient.socialName})</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground">CPF: {patient.cpf}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Nasc: {formatDateBR(patient.birthDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Telefone na ficha de acolhimento
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium text-foreground">{formatDateBR(patient.createdAt)}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  patient.status === "ATIVO" ? "bg-green-100 text-green-700" :
                  patient.status === "EM_CRISE" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {PATIENT_STATUS_LABELS[patient.status]}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-muted-foreground">Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
