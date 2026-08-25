import type { EffectiveTheme, ThemePreference } from "./theme";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { parseThemePreference, useTheme } from "./theme";

export function ThemeSelect() {
  const { effectiveTheme, preference, setPreference } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="选择界面主题"
            title="选择界面主题"
          />
        )}
      >
        <ThemeIcon effectiveTheme={effectiveTheme} preference={preference} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={value => setPreference(parseThemePreference(value))}
        >
          <DropdownMenuLabel>界面主题</DropdownMenuLabel>
          <DropdownMenuRadioItem closeOnClick value="system">
            <Monitor />
            跟随系统
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem closeOnClick value="light">
            <Sun />
            浅色
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem closeOnClick value="dark">
            <Moon />
            深色
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeIcon({ effectiveTheme, preference }: {
  readonly effectiveTheme: EffectiveTheme;
  readonly preference: ThemePreference;
}) {
  if (preference === "system")
    return <Monitor aria-hidden="true" />;
  return effectiveTheme === "dark"
    ? <Moon aria-hidden="true" />
    : <Sun aria-hidden="true" />;
}
