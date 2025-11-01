-- Add update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at columns
CREATE TRIGGER update_saved_schedules_updated_at
BEFORE UPDATE ON public.saved_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_courses_updated_at
BEFORE UPDATE ON public.schedule_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();