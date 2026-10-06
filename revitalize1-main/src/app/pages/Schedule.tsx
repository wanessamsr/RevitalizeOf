import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Eye, Edit2, Trash2, AlertCircle, Play } from "lucide-react";
import { useNavigate } from "react-router";

export default function Schedule() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);

  const [newAppointment, setNewAppointment] = useState({
    title: "",
    professional: "",
    startHour: 9,
    endHour: 10,
    participants: "",
    description: "",
    isUrgent: false,
    color: "bg-green-500"
  });

  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 7); // 7h às 19h

  const colorOptions = [
    { value: "bg-green-500", label: "Verde - Baixa Urgência", description: "Atendimento de rotina" },
    { value: "bg-yellow-500", label: "Amarelo - Média Urgência", description: "Atenção necessária" },
    { value: "bg-red-500", label: "Vermelho - Alta Urgência", description: "Prioridade máxima" },
  ];

  const [appointments, setAppointments] = useState([
    { id: 1, date: new Date(2026, 3, 24), startHour: 9, endHour: 10, title: "Grupo Terapêutico - Ansiedade", participants: 12, isUrgent: false, color: "bg-green-500", description: "Técnicas de respiração" },
    { id: 2, date: new Date(2026, 3, 24), startHour: 14, endHour: 15.5, title: "Atendimento Individual", participants: 1, isUrgent: false, color: "bg-yellow-500", description: "Consulta psicológica" },
    { id: 3, date: new Date(2026, 3, 25), startHour: 11, endHour: 12, title: "Oficina de Arte", participants: 8, isUrgent: false, color: "bg-green-500", description: "Pintura livre" },
    { id: 4, date: new Date(2026, 3, 26), startHour: 9, endHour: 10, title: "Consulta Psiquiátrica", participants: 1, isUrgent: true, color: "bg-red-500", description: "Avaliação urgente" },
    { id: 5, date: new Date(2026, 3, 27), startHour: 15, endHour: 16, title: "Grupo de Familiares", participants: 10, isUrgent: false, color: "bg-yellow-500", description: "Acolhimento familiar" },
    { id: 6, date: new Date(2026, 3, 28), startHour: 10, endHour: 11, title: "Visita Domiciliar", participants: 1, isUrgent: false, color: "bg-green-500", description: "Acompanhamento" },
  ]);

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(apt.date, date));
  };

  const getAppointmentsForSlot = (hour: number) => {
    const dayAppointments = getAppointmentsForDay(selectedDate);
    return dayAppointments.filter(apt => hour >= apt.startHour && hour < apt.endHour);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias do mês anterior para preencher
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Dias do próximo mês para preencher
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  const handleStartAppointment = (appointment: typeof appointments[0]) => {
    navigate('/appointment-session', {
      state: {
        appointment: {
          id: appointment.id,
          time: `${appointment.startHour.toString().padStart(2, '0')}:00`,
          activity: appointment.title,
          participants: appointment.participants,
          description: appointment.description,
          isUrgent: appointment.isUrgent
        }
      }
    });
  };

  const openAddModal = (timeSlot?: number) => {
    if (timeSlot !== undefined && timeSlot !== null) {
      setNewAppointment({
        ...newAppointment,
        startHour: timeSlot,
        endHour: timeSlot + 1
      });
    }
    setShowAddModal(true);
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const newId = Math.max(...appointments.map(apt => apt.id), 0) + 1;
    const newApt = {
      id: newId,
      date: new Date(selectedDate),
      startHour: newAppointment.startHour,
      endHour: newAppointment.endHour,
      title: newAppointment.title,
      participants: parseInt(newAppointment.participants) || 0,
      description: newAppointment.description,
      isUrgent: newAppointment.isUrgent,
      color: newAppointment.color
    };

    setAppointments([...appointments, newApt]);

    setNewAppointment({
      title: "",
      professional: "",
      startHour: 9,
      endHour: 10,
      participants: "",
      description: "",
      isUrgent: false,
      color: "bg-green-500"
    });

    setShowAddModal(false);
  };

  const monthDays = getDaysInMonth();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">Calendário de atendimentos por dia</p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário Mensal */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-1.5 hover:bg-muted rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateMonth("next")}
                className="p-1.5 hover:bg-muted rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, index) => {
              const hasAppointments = getAppointmentsForDay(day.date).length > 0;
              const isSelected = isSameDay(day.date, selectedDate);
              const isTodayDate = isToday(day.date);

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day.date)}
                  className={`aspect-square rounded-lg text-sm transition-all relative ${
                    !day.isCurrentMonth
                      ? "text-muted-foreground/40"
                      : isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isTodayDate
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted"
                  }`}
                >
                  {day.date.getDate()}
                  {hasAppointments && (
                    <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-all text-sm font-medium"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* Vista do Dia Selecionado */}
        <div className="lg:col-span-2 space-y-4">{/* ... Continua abaixo ... */}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigateDay("prev")}
                    className="p-2 hover:bg-muted rounded-lg transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground capitalize">
                      {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </h2>
                    {isToday(selectedDate) && (
                      <span className="text-sm text-primary">Hoje</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigateDay("next")}
                    className="p-2 hover:bg-muted rounded-lg transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {getAppointmentsForDay(selectedDate).length} atendimento(s)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {timeSlots.map((hour) => {
                const slotAppointments = getAppointmentsForSlot(hour);
                return (
                  <div key={hour} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="flex">
                      <div className="w-24 p-4 bg-muted/30 border-r border-border flex flex-col items-center justify-center">
                        <span className="text-lg font-semibold text-foreground">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(hour + 1).toString().padStart(2, '0')}:00
                        </span>
                      </div>
                      <div className="flex-1 min-h-[100px] p-3">
                        {slotAppointments.length === 0 ? (
                          <button
                            onClick={() => openAddModal(hour)}
                            className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all rounded-lg group"
                          >
                            <div className="text-center">
                              <Plus className="w-6 h-6 mx-auto mb-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <p className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                Adicionar atendimento
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {slotAppointments.map((apt) => (
                              <div
                                key={apt.id}
                                className={`${apt.color} text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all group/apt`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-base">{apt.title}</h4>
                                      {apt.isUrgent && (
                                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded-full text-xs flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          URGENTE
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm opacity-90 mb-1">
                                      {apt.startHour.toString().padStart(2, '0')}:00 - {apt.endHour.toString().padStart(2, '0')}:00
                                    </p>
                                    <p className="text-sm opacity-75 mb-2">
                                      {apt.participants} participante(s)
                                    </p>
                                    <p className="text-sm opacity-90">{apt.description}</p>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleStartAppointment(apt)}
                                      className="px-3 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all flex items-center gap-2 text-sm font-medium"
                                      title="Iniciar atendimento"
                                    >
                                      <Play className="w-4 h-4" />
                                      Iniciar
                                    </button>
                                    <div className="flex gap-1">
                                      <button className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Atendimentos no Dia</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {getAppointmentsForDay(selectedDate).length}
              </p>
            </div>
            <CalendarIcon className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Participantes</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {getAppointmentsForDay(selectedDate).reduce((sum, apt) => sum + apt.participants, 0)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Atendimentos Urgentes</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {getAppointmentsForDay(selectedDate).filter(apt => apt.isUrgent).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Horários Ocupados</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {timeSlots.filter(hour => getAppointmentsForSlot(hour).length > 0).length}/{timeSlots.length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full border-4 border-primary opacity-50"></div>
          </div>
        </div>
      </div>

      {/* Modal de Adicionar Agendamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Novo Agendamento</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Atendimento *
                </label>
                <input
                  type="text"
                  required
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
                  placeholder="Ex: Consulta Individual, Grupo Terapêutico..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profissional Responsável *
                </label>
                <select
                  required
                  value={newAppointment.professional}
                  onChange={(e) => setNewAppointment({...newAppointment, professional: e.target.value})}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione o profissional...</option>
                  <option value="Dr. João Silva">Dr. João Silva — Médico Psiquiatra</option>
                  <option value="Psic. Ana Costa">Psic. Ana Costa — Psicóloga</option>
                  <option value="Enf. Carlos Lima">Enf. Carlos Lima — Enfermeiro</option>
                  <option value="TO Maria Souza">TO Maria Souza — Terapeuta Ocupacional</option>
                  <option value="Ass. Social Carla Santos">Ass. Social Carla Santos — Assistente Social</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Horário de Início *
                  </label>
                  <select
                    value={newAppointment.startHour}
                    onChange={(e) => setNewAppointment({...newAppointment, startHour: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {timeSlots.map(hour => (
                      <option key={hour} value={hour}>
                        {hour.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Horário de Término *
                  </label>
                  <select
                    value={newAppointment.endHour}
                    onChange={(e) => setNewAppointment({...newAppointment, endHour: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {timeSlots.filter(h => h > newAppointment.startHour).map(hour => (
                      <option key={hour} value={hour}>
                        {hour.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                    <option value={20}>20:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Número de Participantes *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newAppointment.participants}
                  onChange={(e) => setNewAppointment({...newAppointment, participants: e.target.value})}
                  placeholder="Ex: 1, 5, 10..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={newAppointment.description}
                  onChange={(e) => setNewAppointment({...newAppointment, description: e.target.value})}
                  placeholder="Descreva detalhes do atendimento..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nível de Urgência *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewAppointment({...newAppointment, color: color.value})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        newAppointment.color === color.value
                          ? "border-primary scale-105"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-full h-10 ${color.value} rounded-md mb-2`}></div>
                      <p className="text-sm font-medium text-center text-foreground">{color.label}</p>
                      <p className="text-xs text-center text-muted-foreground mt-1">{color.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAppointment.isUrgent}
                    onChange={(e) => setNewAppointment({...newAppointment, isUrgent: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-input"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Marcar como Urgente</span>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Atendimentos urgentes são destacados em vermelho e têm prioridade
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
                >
                  Adicionar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
