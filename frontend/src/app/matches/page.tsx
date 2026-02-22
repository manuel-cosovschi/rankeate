"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function MatchesPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            const { data } = await api.get('/matches/open');
            setMatches(data);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (matchId: number) => {
        if (!user) {
            router.push('/login?redirect=/matches');
            return;
        }
        router.push(`/matches/${matchId}/accept`);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partidos Abiertos</h1>
                    <p className="text-muted-foreground mt-1">Sumate a un partido buscando jugadores</p>
                </div>
            </div>

            {matches.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                        <Trophy className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="font-semibold text-lg">No hay partidos abiertos</h3>
                        <p className="text-muted-foreground mt-1">
                            Volvé más tarde o creá un partido desde tus reservas.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {matches.map((match) => (
                        <Card key={match.id} className="overflow-hidden transition-all hover:shadow-md border-primary/10">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        Buscando jugadores
                                    </Badge>
                                    <div className="flex items-center text-sm font-medium bg-background px-2 py-1 rounded-md shadow-sm border">
                                        <Users className="w-4 h-4 mr-1 text-primary" />
                                        {match.participants.length} / {match.maxPlayers}
                                    </div>
                                </div>
                                <CardTitle className="text-lg">
                                    {match.booking.club.name}
                                </CardTitle>
                                <div className="flex items-center text-sm text-muted-foreground mt-2">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    Cancha {match.booking.court.name}
                                </div>
                            </CardHeader>

                            <CardContent className="pt-4">
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center text-sm">
                                        <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                                        <span className="capitalize">{format(new Date(match.booking.startAt), "EEEE d 'de' MMMM", { locale: es })}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Clock className="w-4 h-4 mr-3 text-muted-foreground" />
                                        <span>
                                            {format(new Date(match.booking.startAt), "HH:mm")} - {format(new Date(match.booking.endAt), "HH:mm")}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Trophy className="w-4 h-4 mr-3 text-muted-foreground" />
                                        <span>Creado por: {match.createdBy.firstName} {match.createdBy.lastName}</span>
                                    </div>

                                    {match.notes && (
                                        <div className="mt-4 p-3 bg-muted rounded-md text-sm italic text-muted-foreground border-l-2 border-primary">
                                            "{match.notes}"
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Costo por jugador</p>
                                        <p className="font-bold text-lg text-primary">
                                            ${Math.ceil(match.booking.totalPrice / match.maxPlayers).toLocaleString('es-AR')}
                                        </p>
                                    </div>
                                    <Button onClick={() => handleJoin(match.id)}>
                                        Unirme
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
