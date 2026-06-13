import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Lead } from "@/types/lead"

const ALREADY_CONVERTED_TOOLTIP = "Already converted"

interface ConvertToClientButtonProps {
  lead: Lead
  converting?: boolean
  onConvert: () => void
}

export function ConvertToClientButton({
  lead,
  converting = false,
  onConvert,
}: ConvertToClientButtonProps) {
  const isConverted = lead.status === "converted"

  if (isConverted) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
              >
                <UserPlus className="size-4" />
                Convert to Client
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{ALREADY_CONVERTED_TOOLTIP}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={converting}
      onClick={onConvert}
    >
      <UserPlus className="size-4" />
      Convert to Client
    </Button>
  )
}

interface ConvertToClientMenuItemProps {
  lead: Lead
  onConvert: () => void
}

export function ConvertToClientMenuItem({
  lead,
  onConvert,
}: ConvertToClientMenuItemProps) {
  const isConverted = lead.status === "converted"

  if (isConverted) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-full">
              <DropdownMenuItem disabled>Convert to Client</DropdownMenuItem>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            {ALREADY_CONVERTED_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenuItem onClick={onConvert}>Convert to Client</DropdownMenuItem>
  )
}
