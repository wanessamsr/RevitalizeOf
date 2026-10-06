import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Clock, Users, AlertCircle, Save, FileText, Check } from "lucide-react";

export default function AppointmentSession() {
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<any>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState("");

  useEffect(() => {
    const savedAppointment = localStorage.getItem('currentAppointment');
    if (savedAppointment) {
      setAppointment(JSON.parse(savedAppointment));
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  const getElapsedTime = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [elapsedTime, setElapsedTime] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      setAttendees([...attendees, newAttendee.trim()]);
      setNewAttendee("");
    }
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleFinishAppointment = () => {
    if (confirm("Deseja finalizar o atendimento?")) {
      localStorage.removeItem('currentAppointment');
      navigate('/dashboard');
    }
  };

  if (!appointment) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-muted rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-foreground">Atendimento em Andamento</h1>
          <p className="text-muted-foreground mt-1">Registre as informações do atendimento</p>
        </div>
        <div className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Tempo decorrido</p>
            <p className="text-xl font-semibold text-foreground font-mono">{elapsedTime}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl p-6 text-white ${
        appointment.isUrgent
          ? "bg-gradient-to-r from-red-600 to-red-700"
          : "bg-gradient-to-r from-primary to-secondary"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{appointment.activity}</h2>
              {appointment.isUrgent && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  ATENDIMENTO URGENTE
                </span>
              )}
            </div>
            <p className="text-white/80 mt-2">Horário agendado: {appointment.time}</p>
            <p className="text-white/80">Participantes esperados: {appointment.participants}</p>
            {appointment.description && (
              <p className="text-white/90 mt-3 text-sm">{appointment.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Registro do Atendimento
            </h3>
            <textarea
              rows={15}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite aqui as anotações do atendimento...&#10;&#10;- Principais temas abordados&#10;- Participação dos pacientes&#10;- Observações relevantes&#10;- Encaminhamentos necessários&#10;- Próximos passos"
              className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
            />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {notes.length} caracteres
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('appointmentNotes', notes);
                  alert('Rascunho salvo com sucesso!');
                }}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-all text-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Rascunho
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Presença
            </h3>
            <div className="space-y-3 mb-4">
              {attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum participante registrado
                </p>
              ) : (
                attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-foreground">{attendee}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAttendee(index)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                placeholder="Nome do participante"
                className="flex-1 px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <button
                onClick={handleAddAttendee}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm"
              >
                Adicionar
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Total de participantes: {attendees.length}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Informações do Atendimento</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Início:</span>
                <span className="font-medium">{startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{startTime.toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração:</span>
                <span className="font-medium font-mono">{elapsedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{appointment.activity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-all"
        >
          Voltar sem Salvar
        </button>
        <button
          onClick={handleFinishAppointment}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
        >
          <Check className="w-5 h-5" />
          Finalizar Atendimento
        </button>
      </div>
    </div>
  );
}
