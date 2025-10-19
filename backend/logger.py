"""
MIDICOM Logging System
======================

Sistema di logging centralizzato per MIDICOM backend.
Fornisce configurazione uniforme e utility per logging strutturato.

Author: MIDICOM Team
Version: 1.0.0
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

# Colori ANSI per output console
class Colors:
    """Codici colore ANSI per output terminale"""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    
    # Colori base
    BLACK = '\033[30m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'
    
    # Colori brillanti
    BRIGHT_RED = '\033[91m'
    BRIGHT_GREEN = '\033[92m'
    BRIGHT_YELLOW = '\033[93m'
    BRIGHT_BLUE = '\033[94m'


class ColoredFormatter(logging.Formatter):
    """Formatter con supporto colori per livelli di log"""
    
    FORMATS = {
        logging.DEBUG: Colors.CYAN + '%(asctime)s - %(name)s - DEBUG - %(message)s' + Colors.RESET,
        logging.INFO: Colors.GREEN + '%(asctime)s - %(name)s - INFO - %(message)s' + Colors.RESET,
        logging.WARNING: Colors.YELLOW + '%(asctime)s - %(name)s - WARNING - %(message)s' + Colors.RESET,
        logging.ERROR: Colors.RED + '%(asctime)s - %(name)s - ERROR - %(message)s' + Colors.RESET,
        logging.CRITICAL: Colors.BRIGHT_RED + Colors.BOLD + '%(asctime)s - %(name)s - CRITICAL - %(message)s' + Colors.RESET,
    }
    
    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno, self.FORMATS[logging.INFO])
        formatter = logging.Formatter(log_fmt, datefmt='%Y-%m-%d %H:%M:%S')
        return formatter.format(record)


def setup_logger(
    name: str,
    level: int = logging.INFO,
    log_file: Optional[Path] = None,
    use_colors: bool = True
) -> logging.Logger:
    """
    Configura un logger con formatter personalizzato
    
    Args:
        name: Nome del logger (di solito __name__)
        level: Livello di logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path opzionale per salvare log su file
        use_colors: Se True, usa colori ANSI per console output
    
    Returns:
        Logger configurato
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Rimuovi handler esistenti per evitare duplicati
    logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    if use_colors and sys.stdout.isatty():
        console_handler.setFormatter(ColoredFormatter())
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    # File handler (opzionale)
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(level)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Ottieni un logger già configurato o creane uno nuovo
    
    Args:
        name: Nome del logger (di solito __name__)
    
    Returns:
        Logger configurato
    """
    logger = logging.getLogger(name)
    
    # Se non ha handler, configuralo
    if not logger.handlers:
        return setup_logger(name)
    
    return logger


# Logger di default per il backend
default_logger = setup_logger('midicom', level=logging.INFO)


# Funzioni di utility per logging rapido
def info(message: str, *args, **kwargs):
    """Log messaggio INFO"""
    default_logger.info(message, *args, **kwargs)


def debug(message: str, *args, **kwargs):
    """Log messaggio DEBUG"""
    default_logger.debug(message, *args, **kwargs)


def warning(message: str, *args, **kwargs):
    """Log messaggio WARNING"""
    default_logger.warning(message, *args, **kwargs)


def error(message: str, *args, **kwargs):
    """Log messaggio ERROR"""
    default_logger.error(message, *args, **kwargs)


def critical(message: str, *args, **kwargs):
    """Log messaggio CRITICAL"""
    default_logger.critical(message, *args, **kwargs)


if __name__ == "__main__":
    # Test del logger
    test_logger = setup_logger('test', level=logging.DEBUG)
    
    test_logger.debug("Questo è un messaggio di DEBUG")
    test_logger.info("Questo è un messaggio di INFO")
    test_logger.warning("Questo è un messaggio di WARNING")
    test_logger.error("Questo è un messaggio di ERROR")
    test_logger.critical("Questo è un messaggio di CRITICAL")
    
    print("\n✅ Logger test completato!")

