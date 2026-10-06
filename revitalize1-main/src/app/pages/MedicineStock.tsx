import { Pill, Plus, AlertTriangle, Package, TrendingDown } from "lucide-react";

export default function MedicineStock() {
  const medicines = [
    { id: 1, name: "Fluoxetina 20mg", quantity: 240, minQuantity: 100, unit: "comprimidos", status: "ok" },
    { id: 2, name: "Clonazepam 2mg", quantity: 45, minQuantity: 80, unit: "comprimidos", status: "low" },
    { id: 3, name: "Risperidona 2mg", quantity: 180, minQuantity: 120, unit: "comprimidos", status: "ok" },
    { id: 4, name: "Quetiapina 25mg", quantity: 25, minQuantity: 100, unit: "comprimidos", status: "critical" },
    { id: 5, name: "Haloperidol 5mg", quantity: 320, minQuantity: 150, unit: "comprimidos", status: "ok" },
    { id: 6, name: "Carbamazepina 200mg", quantity: 90, minQuantity: 100, unit: "comprimidos", status: "low" },
  ];

  const recentMovements = [
    { date: "23/04/2026", medicine: "Fluoxetina 20mg", type: "saída", quantity: 30, patient: "Maria Silva Santos" },
    { date: "23/04/2026", medicine: "Risperidona 2mg", type: "entrada", quantity: 100, patient: "Entrada de estoque" },
    { date: "22/04/2026", medicine: "Clonazepam 2mg", type: "saída", quantity: 15, patient: "João Pedro Oliveira" },
    { date: "22/04/2026", medicine: "Quetiapina 25mg", type: "saída", quantity: 20, patient: "Ana Paula Costa" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "bg-green-100 text-green-700";
      case "low":
        return "bg-yellow-100 text-yellow-700";
      case "critical":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ok":
        return "Normal";
      case "low":
        return "Baixo";
      case "critical":
        return "Crítico";
      default:
        return "";
    }
  };

  const criticalCount = medicines.filter(m => m.status === "critical").length;
  const lowCount = medicines.filter(m => m.status === "low").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Estoque de Medicamentos</h1>
          <p className="text-muted-foreground mt-1">Controle de entrada e saída da farmácia</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">
          <Plus className="w-5 h-5" />
          Registrar Movimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <Package className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">{medicines.length}</p>
          <p className="text-white/80 mt-1">Medicamentos Cadastrados</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <TrendingDown className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">{lowCount}</p>
          <p className="text-white/80 mt-1">Estoque Baixo</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <AlertTriangle className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">{criticalCount}</p>
          <p className="text-white/80 mt-1">Estoque Crítico</p>
        </div>
      </div>

      {(criticalCount > 0 || lowCount > 0) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Atenção: Medicamentos com Estoque Baixo</h3>
              <p className="text-sm text-red-700 mt-1">
                {criticalCount > 0 && `${criticalCount} medicamento(s) em nível crítico. `}
                {lowCount > 0 && `${lowCount} medicamento(s) com estoque baixo. `}
                Providencie reposição o mais breve possível.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-6">Estoque Atual</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground">Medicamento</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Quantidade</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Estoque Mínimo</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Status</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine) => (
                <tr key={medicine.id} className="border-b border-border hover:bg-muted/50 transition-all">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{medicine.name}</p>
                        <p className="text-sm text-muted-foreground">{medicine.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`font-semibold ${medicine.status === "critical" ? "text-red-600" : medicine.status === "low" ? "text-yellow-600" : "text-foreground"}`}>
                      {medicine.quantity}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-muted-foreground">
                    {medicine.minQuantity}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(medicine.status)}`}>
                      {getStatusLabel(medicine.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="text-sm text-primary hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-6">Movimentações Recentes</h2>
        <div className="space-y-3">
          {recentMovements.map((movement, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  movement.type === "entrada" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}>
                  {movement.type === "entrada" ? "+" : "-"}
                  {movement.quantity}
                </div>
                <div>
                  <p className="font-medium text-foreground">{movement.medicine}</p>
                  <p className="text-sm text-muted-foreground">{movement.patient}</p>
                  <p className="text-xs text-muted-foreground mt-1">{movement.date}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                movement.type === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {movement.type === "entrada" ? "Entrada" : "Saída"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
