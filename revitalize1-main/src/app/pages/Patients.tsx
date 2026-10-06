import { Search, Filter, UserPlus, Calendar, Phone } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { getPatients, type Patient } from "../api";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPatients()
      .then((data) => {
        if (active) setPatients(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os pacientes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const normalizeCPF = (value: string) => value.replace(/\D/g, "");

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         normalizeCPF(patient.cpf).includes(normalizeCPF(searchTerm));
    const matchesFilter = filterStatus === "all" || patient.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Em Crise">Em Crise</option>
              <option value="Inativo">Inativo</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-input-background border border-input rounded-lg hover:bg-muted transition-all">
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Mostrando {filteredPatients.length} de {patients.length} paciente(s)
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
        {filteredPatients.map((patient) => (
          <Link
            key={patient.id}
            to={`/patients/${patient.id}`}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/50 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg">
                  {patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg">{patient.fullName}</h3>
                  <p className="text-sm text-muted-foreground">CPF: {patient.cpf}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Nasc: {patient.birthDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {patient.phone || "Telefone não informado"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Último Atendimento</p>
                  <p className="font-medium text-foreground">{patient.admissionDate || "Não informado"}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Diagnóstico</p>
                  <p className="font-medium text-foreground">{patient.diagnosis || "Não informado"}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  patient.status === "Ativo" ? "bg-green-100 text-green-700" :
                  patient.status === "Em Crise" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {patient.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
