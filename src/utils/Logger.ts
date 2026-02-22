class Logger {
    private formatTimestamp(): string {
        return new Date().toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    private formatMessage(message: string): string {
        return `[${this.formatTimestamp()}] ${message}`;
    }

    log(message: string): void {
        console.log(this.formatMessage(message));
    }
}

export default new Logger();
