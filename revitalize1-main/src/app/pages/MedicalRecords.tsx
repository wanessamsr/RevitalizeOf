import { FileText, Search, Calendar, User, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function MedicalRecords() {
  const navigate = useNavigate();
  const [searchName, setSearchName] = useState("");
  const [searchCPF, setSearchCPF] = useState("");
  const [searchBirthDate, setSearchBirthDate] = useState("");

  const allPatients = [
    {
      id: 1,
      name: "Maria Silva Santos",
      cpf: "123.456.789-00",
      birthDate: "1985-03-15",
      diagnosis: "F32 - Episódio Depressivo",
      admissionDate: "2024-01-10",
      status: "Ativo"
    },
    {
      id: 2,
      name: "João Pedro Oliveira",
      cpf: "234.567.890-11",
      birthDate: "1978-07-22",
      diagnosis: "F20 - Esquizofrenia",
      admissionDate: "2023-08-05",
      status: "Ativo"
    },
    {
      id: 3,
      name: "Ana Paula Costa",
      cpf: "345.678.901-22",
      birthDate: "1992-11-30",
      diagnosis: "F41 - Outros Transtornos Ansiosos",
      admissionDate: "2025-02-18",
      status: "Ativo"
    },
    {
      id: 4,
      name: "Carlos Eduardo Lima",
      cpf: "456.789.012-33",
      birthDate: "1980-05-08",
      diagnosis: "F31 - Transtorno Afetivo Bipolar",
      admissionDate: "2023-11-20",
      status: "Ativo"
    },
    {
      id: 5,
      name: "Juliana Ferreira Souza",
      cpf: "567.890.123-44",
      birthDate: "1987-09-14",
      diagnosis: "F10 - Transtornos Uso de Álcool",
      admissionDate: "2024-05-12",
      status: "Ativo"
    },
    {
      id: 6,
      name: "Roberto Santos Alves",
      cpf: "678.901.234-55",
      birthDate: "1975-12-03",
      diagnosis: "F33 - Transtorno Depressivo Recorrente",
      admissionDate: "2022-09-30",
      status: "Inativo"
    },
  ];

  const normalizeCPF = (value: string) => value.replace(/\D/g, "");

  const parseBirthDate = (value: string) => {
    if (!value) return "";
    // DD/MM/YYYY → YYYY-MM-DD
    if (value.includes("/")) {
      const [d, m, y] = value.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return value; // already YYYY-MM-DD
  };

  const filteredPatients = allPatients.filter(patient => {
    const nameMatch = !searchName ||
      patient.name.toLowerCase().includes(searchName.toLowerCase());
    const cpfMatch = !searchCPF ||
      normalizeCPF(patient.cpf).includes(normalizeCPF(searchCPF));
    const birthDateMatch = !searchBirthDate ||
      patient.birthDate === parseBirthDate(searchBirthDate);
    return nameMatch && cpfMatch && birthDateMatch;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Prontuários</h1>
        <p className="text-muted-foreground mt-1">Busca e acesso aos prontuários dos pacientes</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Buscar Paciente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Digite o nome do paciente"
                className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">CPF</label>
            <input
              type="text"
              value={searchCPF}
              onChange={(e) => setSearchCPF(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Data de Nascimento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                value={searchBirthDate}
                onChange={(e) => setSearchBirthDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {searchBirthDate && (
            <p className="text-xs text-primary font-medium">
              Filtrando por data de nascimento: {searchBirthDate.split("-").reverse().join("/")}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredPatients.length} resultado(s) encontrado(s)
            </p>
            {(searchName || searchCPF || searchBirthDate) && (
              <button
                onClick={() => {
                  setSearchName("");
                  setSearchCPF("");
                  setSearchBirthDate("");
                }}
                className="text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum paciente encontrado com os filtros aplicados</p>
            <p className="text-sm text-muted-foreground mt-2">Tente ajustar os critérios de busca</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg flex-shrink-0">
                    {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.status === "Ativo"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {patient.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 text-sm text-muted-foreground">
                      <div>
                        <strong className="text-foreground">CPF:</strong> {patient.cpf}
                      </div>
                      <div>
                        <strong className="text-foreground">Nascimento:</strong>{" "}
                        {patient.birthDate.split("-").reverse().join("/")}
                      </div>
                      <div>
                        <strong className="text-foreground">Admissão:</strong>{" "}
                        {patient.admissionDate.split("-").reverse().join("/")}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <strong className="text-foreground">Diagnóstico:</strong>{" "}
                      <span className="text-muted-foreground">{patient.diagnosis}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
                >
                  <Eye className="w-5 h-5" />
                  Ver Prontuário
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
