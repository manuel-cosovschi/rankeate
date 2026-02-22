"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CreditCard, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MatchAcceptPage() {
    const router = useRouter();
    const params = useParams();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMatch();
    }, [params.id]);

    const fetchMatch = async () => {
        try {
            // First try to join if we aren't already. If we are, it returns 409 but we can catch it.
            // Actually, better flow: fetch match details, if user is not participant, show "Join" button.
            // Since we don't have a single match GET endpoint yet, we'll hit `/matches/open` and filter,
            // or try to join and handle the 409 gracefully.

            const { data } = await api.post(`/matches/${params.id}/join`);

            // If successful, participant is created with PENDING_PAYMENT status
            // We need to fetch match details. For now, the join returns the participant info.
            // We really need the full match data though. Let's do a workaround:
            const openMatchesRes = await api.get('/matches/open');
            const foundMatch = openMatchesRes.data.find((m: any) => m.id === parseInt(params.id as string));

            if (foundMatch) {
                setMatch(foundMatch);
            } else {
                // If it's not open, it might be FULL or already confirmed for us
                // Fetch player matches instead
                const mineRes = await api.get('/matches/mine');
                const myMatch = mineRes.data.find((p: any) => p.matchId === parseInt(params.id as string));
                if (myMatch) {
                    setMatch(myMatch.match);
                } else {
                    setError('No se pudo encontrar el partido');
                }
            }
        } catch (err: any) {
            if (err.response?.status === 409) {
                // Already joined/confirmed
                setError('Ya sos parte de este partido o está lleno.');
            } else {
                setError(err.response?.data?.error || 'Error al cargar el partido');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async () => {
        setJoining(true);
        setError('');
        try {
            const { data } = await api.post(`/matches/${params.id}/accept`);

            if (data.free) {
                router.push('/dashboard?success=match_confirmed');
                return;
            }

            if (data.preferenceUrl) {
                window.location.href = data.preferenceUrl;
            } else {
                setError('No se pudo generar el pago');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al procesar la reserva del cupo');
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error && !match) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-lg">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4 w-full" onClick={() => router.push('/matches')}>
                    Volver a Partidos
                </Button>
            </div>
        );
    }

    const splitAmount = match ? Math.ceil(match.booking.totalPrice / match.maxPlayers) : 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Confirmar tu Lugar</h1>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {match && (
                <Card className="border-primary/20 shadow-md">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                <Zap className="w-3 h-3 mr-1" />
                                Reserva Rápida
                            </Badge>
                        </div>
                        <CardTitle className="text-2xl">{match.booking.club.name}</CardTitle>
                        <CardDescription className="text-base flex items-center mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            {match.booking.club.address}, Cancha {match.booking.court.name}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted p-4 rounded-lg flex flex-col justify-center items-center text-center">
                                <Calendar className="w-6 h-6 text-primary mb-2" />
                                <span className="text-sm font-medium capitalize">
                                    {format(new Date(match.booking.startAt), "EEEE d MMM", { locale: es })}
                                </span>
                            </div>
                            <div className="bg-muted p-4 rounded-lg flex flex-col justify-center items-center text-center">
                                <Clock className="w-6 h-6 text-primary mb-2" />
                                <span className="text-sm font-medium">
                                    {format(new Date(match.booking.startAt), "HH:mm")} hs
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <h3 className="font-medium">Detalle del Pago</h3>
                            <div className="flex justify-between text-sm py-2 border-b">
                                <span className="text-muted-foreground">Valor total de cancha</span>
                                <span>${match.booking.totalPrice.toLocaleString('es-AR')}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b">
                                <span className="text-muted-foreground">Cupos totales</span>
                                <span>{match.maxPlayers} jugadores</span>
                            </div>
                            <div className="flex justify-between py-3">
                                <span className="font-bold">Tu Parte (1/{match.maxPlayers})</span>
                                <span className="font-bold text-lg text-primary">${splitAmount.toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <Alert className="bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900">
                            <ShieldCheck className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
                            <AlertTitle>Pago Seguro</AlertTitle>
                            <AlertDescription className="text-sm mt-1">
                                Tu lugar se reservará por 5 minutos mientras completás el pago en Mercado Pago. Si se cancela el partido, se reembolsa automáticamente.
                            </AlertDescription>
                        </Alert>
                    </CardContent>

                    <CardFooter className="flex gap-4 pt-2 border-t mt-2">
                        <Button variant="outline" className="flex-1" onClick={() => router.push('/matches')} disabled={joining}>
                            Cancelar
                        </Button>
                        <Button className="flex-1" onClick={handlePay} disabled={joining || !!error}>
                            {joining ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Pagar Tu Parte
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
