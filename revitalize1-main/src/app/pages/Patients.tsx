import { Search, Filter, UserPlus, Calendar, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const patients = [
    { id: 1, name: "Maria Silva Santos", cpf: "123.456.789-00", birthDate: "15/03/1985", phone: "(62) 98765-4321", status: "Ativo", lastVisit: "22/04/2026", diagnosis: "F32 - Episódio Depressivo" },
    { id: 2, name: "João Pedro Oliveira", cpf: "234.567.890-11", birthDate: "22/07/1978", phone: "(62) 98876-5432", status: "Ativo", lastVisit: "21/04/2026", diagnosis: "F20 - Esquizofrenia" },
    { id: 3, name: "Ana Paula Costa", cpf: "345.678.901-22", birthDate: "08/11/1992", phone: "(62) 98987-6543", status: "Ativo", lastVisit: "20/04/2026", diagnosis: "F41 - Outros Transtornos Ansiosos" },
    { id: 4, name: "Carlos Eduardo Lima", cpf: "456.789.012-33", birthDate: "30/05/1980", phone: "(62) 98098-7654", status: "Em Crise", lastVisit: "23/04/2026", diagnosis: "F31 - Transtorno Afetivo Bipolar" },
    { id: 5, name: "Juliana Ferreira Souza", cpf: "567.890.123-44", birthDate: "12/09/1995", phone: "(62) 98109-8765", status: "Ativo", lastVisit: "19/04/2026", diagnosis: "F10 - Transtornos Uso de Álcool" },
    { id: 6, name: "Roberto Santos Alves", cpf: "678.901.234-55", birthDate: "25/01/1988", phone: "(62) 98210-9876", status: "Inativo", lastVisit: "10/03/2026", diagnosis: "F33 - Transtorno Depressivo Recorrente" },
  ];

  const normalizeCPF = (value: string) => value.replace(/\D/g, "");

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                  {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg">{patient.name}</h3>
                  <p className="text-sm text-muted-foreground">CPF: {patient.cpf}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Nasc: {patient.birthDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {patient.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Último Atendimento</p>
                  <p className="font-medium text-foreground">{patient.lastVisit}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Diagnóstico</p>
                  <p className="font-medium text-foreground">{patient.diagnosis}</p>
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
