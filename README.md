# AWC_DevTool

export async function getSysLog() {
    let syslog = await soaService.post(
        "Internal-DebugMonitor-2011-06-DebugLogging",
        "getSyslogFile",
        { size: 150000 }
    );
    return syslog.out;
}
