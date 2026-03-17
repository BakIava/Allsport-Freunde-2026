"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, MapPin, Euro, Shirt } from "lucide-react";
import type { EventWithRegistrations } from "@/lib/types";
import { motion } from "framer-motion";

const categoryConfig = {
  fussball: {
    label: "Fußball ⚽",
    variant: "fussball" as const,
    progressColor: "bg-green-500",
  },
  fitness: {
    label: "Fitness 💪",
    variant: "fitness" as const,
    progressColor: "bg-orange-500",
  },
  schwimmen: {
    label: "Schwimmen 🏊",
    variant: "schwimmen" as const,
    progressColor: "bg-blue-500",
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  return timeStr + " Uhr";
}

interface EventCardProps {
  event: EventWithRegistrations;
  index: number;
  onRegister: (event: EventWithRegistrations) => void;
}

export default function EventCard({ event, index, onRegister }: EventCardProps) {
  const config = categoryConfig[event.category];
  const isFull = event.current_participants >= event.max_participants;
  const percentage = (event.current_participants / event.max_participants) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: 0.05 * index }}
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mt-2">{event.title}</h3>
          <p className="text-sm text-gray-500">{event.description}</p>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 shrink-0 text-gray-400" />
              <span>{formatTime(event.time)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Euro className="w-4 h-4 shrink-0 text-gray-400" />
              <span>{event.price}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Shirt className="w-4 h-4 shrink-0 text-gray-400" />
              <span>{event.dress_code}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">Belegung</span>
              <span className={`font-medium ${isFull ? "text-red-600" : "text-gray-700"}`}>
                {event.current_participants} von {event.max_participants} Plätzen
              </span>
            </div>
            <Progress
              value={percentage}
              indicatorClassName={isFull ? "bg-red-500" : config.progressColor}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            onClick={() => onRegister(event)}
            disabled={isFull}
            variant={isFull ? "secondary" : "default"}
          >
            {isFull ? "Ausgebucht" : "Jetzt anmelden"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
