import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

// Flag SVG components for better cross-platform compatibility
const FlagES = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#c60b1e" d="M0 0h640v480H0z"/>
    <path fill="#ffc400" d="M0 120h640v240H0z"/>
  </svg>
);

const FlagGB = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#012169" d="M0 0h640v480H0z"/>
    <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
    <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
    <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
    <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
  </svg>
);

const FlagDE = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#000" d="M0 0h640v160H0z"/>
    <path fill="#D00" d="M0 160h640v160H0z"/>
    <path fill="#FFCE00" d="M0 320h640v160H0z"/>
  </svg>
);

const FlagIT = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#009246" d="M0 0h213.3v480H0z"/>
    <path fill="#fff" d="M213.3 0h213.4v480H213.3z"/>
    <path fill="#ce2b37" d="M426.7 0H640v480H426.7z"/>
  </svg>
);

const FlagFR = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#002654" d="M0 0h213.3v480H0z"/>
    <path fill="#fff" d="M213.3 0h213.4v480H213.3z"/>
    <path fill="#ce1126" d="M426.7 0H640v480H426.7z"/>
  </svg>
);

const FlagRU = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#fff" d="M0 0h640v160H0z"/>
    <path fill="#0039a6" d="M0 160h640v160H0z"/>
    <path fill="#d52b1e" d="M0 320h640v160H0z"/>
  </svg>
);

const FlagCN = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#de2910" d="M0 0h640v480H0z"/>
    <path fill="#ffde00" d="M119.5 67.8l23.5 72.4-61.6-44.8h76.2l-61.6 44.8z"/>
    <path fill="#ffde00" d="M185 38l7 21.6-18.4-13.4h22.8L178 59.6zM213 73l7 21.6-18.4-13.4h22.8l-18.4 13.4zM213 121l7 21.6-18.4-13.4h22.8l-18.4 13.4zM185 156l7 21.6-18.4-13.4h22.8l-18.4 13.4z"/>
  </svg>
);

const languages = [
  { code: 'es', name: 'Español', Flag: FlagES },
  { code: 'en', name: 'English', Flag: FlagGB },
  { code: 'de', name: 'Deutsch', Flag: FlagDE },
  { code: 'it', name: 'Italiano', Flag: FlagIT },
  { code: 'fr', name: 'Français', Flag: FlagFR },
  { code: 'ru', name: 'Русский', Flag: FlagRU },
  { code: 'zh', name: '中文', Flag: FlagCN },
];

export const LanguageSelector = ({ variant = "ghost", showLabel = false }) => {
  const { i18n } = useTranslation();
  
  const currentLang = languages.find(l => l.code === i18n.language?.substring(0, 2)) || languages[0];
  const CurrentFlag = currentLang.Flag;
  
  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2 px-2">
          <CurrentFlag />
          {showLabel && <span className="hidden sm:inline text-sm">{currentLang.name}</span>}
          <Globe className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {languages.map((lang) => {
          const LangFlag = lang.Flag;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`cursor-pointer gap-3 ${i18n.language?.substring(0, 2) === lang.code ? 'bg-accent' : ''}`}
            >
              <LangFlag />
              <span>{lang.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
