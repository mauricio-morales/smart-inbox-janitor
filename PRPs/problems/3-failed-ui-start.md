for github issue 3, we are getting this error trying to start the Avalonia UI. It is not loading and throws an error which also triggers a mac osx app-crash screen.
We need to research this problem and fix the app. It has never loaded before, so we may be missing some basic setup stuff. This was created by AI so it may be useful to compare project files and startup logic with a HelloWorld example of Avalonia.

This is the console output from running the "Dev Mode" vstask. 

dotnet watch ⌚ Building /Users/mmorales/Dev/smart-inbox-janitor/src/TrashMailPanda/TrashMailPanda/TrashMailPanda.csproj ...
dotnet watch 🔨 Build succeeded: /Users/mmorales/Dev/smart-inbox-janitor/src/TrashMailPanda/TrashMailPanda/TrashMailPanda.csproj
Unhandled exception. Avalonia.Markup.Xaml.XamlLoadException: No precompiled XAML found for TrashMailPanda.App, make sure to specify x:Class and include your XAML file as AvaloniaResource
   at Avalonia.Markup.Xaml.AvaloniaXamlLoader.Load(Object obj)
   at TrashMailPanda.App.InitializeComponent() in /Users/mmorales/Dev/smart-inbox-janitor/src/TrashMailPanda/TrashMailPanda/App.axaml.cs:line 31
   at TrashMailPanda.App.Initialize() in /Users/mmorales/Dev/smart-inbox-janitor/src/TrashMailPanda/TrashMailPanda/App.axaml.cs:line 26
   at Avalonia.AppBuilder.SetupUnsafe()
   at Avalonia.AppBuilder.Setup()
   at Avalonia.AppBuilder.SetupWithLifetime(IApplicationLifetime lifetime)
   at Avalonia.ClassicDesktopStyleApplicationLifetimeExtensions.StartWithClassicDesktopLifetime(AppBuilder builder, String[] args, Action`1 lifetimeBuilder)
   at TrashMailPanda.Program.Main(String[] args) in /Users/mmorales/Dev/smart-inbox-janitor/src/TrashMailPanda/TrashMailPanda/Program.cs:line 12
dotnet watch ❌ [TrashMailPanda (net9.0)] Exited with error code 134

And this is the details on the crashed app window from osx:

-------------------------------------
Translated Report (Full Report Below)
-------------------------------------

Process:               TrashMailPanda [79622]
Path:                  /Users/USER/*/TrashMailPanda
Identifier:            TrashMailPanda
Version:               ???
Code Type:             ARM-64 (Native)
Parent Process:        dotnet [79605]
Responsible:           stable [731]
User ID:               501

Date/Time:             2025-09-01 11:06:42.4175 -0600
OS Version:            macOS 15.5 (24F74)
Report Version:        12
Anonymous UUID:        6E786EDD-1862-5B8C-FEFD-5B3B6F24CC06

Sleep/Wake UUID:       712CAB6D-E025-4396-8599-F190827ECDE7

Time Awake Since Boot: 98000 seconds
Time Since Wake:       662 seconds

System Integrity Protection: enabled

Crashed Thread:        0  Dispatch queue: com.apple.main-thread

Exception Type:        EXC_CRASH (SIGABRT)
Exception Codes:       0x0000000000000000, 0x0000000000000000

Termination Reason:    Namespace SIGNAL, Code 6 Abort trap: 6
Terminating Process:   TrashMailPanda [79622]

Application Specific Information:
abort() called


Thread 0 Crashed::  Dispatch queue: com.apple.main-thread
0   libsystem_kernel.dylib        	       0x194925388 __pthread_kill + 8
1   libsystem_pthread.dylib       	       0x19495e88c pthread_kill + 296
2   libsystem_c.dylib             	       0x194867c60 abort + 124
3   libcoreclr.dylib              	       0x1053f9d04 PROCAbort + 72
4   libcoreclr.dylib              	       0x1053f9c10 TerminateProcess + 176
5   libcoreclr.dylib              	       0x1055f53f0 SfiNext + 1388
6   ???                           	       0x107fc4844 ???
7   ???                           	       0x107fc3f48 ???
8   libcoreclr.dylib              	       0x10568bab0 CallDescrWorkerInternal + 132
9   libcoreclr.dylib              	       0x10550f3e8 DispatchCallSimple(unsigned long*, unsigned int, unsigned long, unsigned int) + 264
10  libcoreclr.dylib              	       0x1055f1864 DispatchManagedException(Object*, _CONTEXT*) + 320
11  libcoreclr.dylib              	       0x1055f19e0 DispatchManagedException(Object*) + 40
12  libcoreclr.dylib              	       0x105563834 ThrowNew(Object*) + 180
13  libcoreclr.dylib              	       0x10556392c IL_Throw(Object*) + 180
14  ???                           	       0x108df8964 ???
15  ???                           	       0x108df8808 ???
16  ???                           	       0x108df79e8 ???
17  ???                           	       0x108dc7848 ???
18  ???                           	       0x108dc74a4 ???
19  ???                           	       0x108dc7208 ???
20  ???                           	       0x108da7aa4 ???
21  ???                           	       0x108d91cb0 ???
22  libcoreclr.dylib              	       0x10568bab0 CallDescrWorkerInternal + 132
23  libcoreclr.dylib              	       0x10550f78c MethodDescCallSite::CallTargetWorker(unsigned long long const*, unsigned long long*, int) + 832
24  libcoreclr.dylib              	       0x105413b5c RunMain(MethodDesc*, short, int*, PtrArray**) + 624
25  libcoreclr.dylib              	       0x105413eb8 Assembly::ExecuteMainMethod(PtrArray**, int) + 268
26  libcoreclr.dylib              	       0x1054384fc CorHost2::ExecuteAssembly(unsigned int, char16_t const*, int, char16_t const**, unsigned int*) + 640
27  libcoreclr.dylib              	       0x105403574 coreclr_execute_assembly + 232
28  libhostpolicy.dylib           	       0x104a9fb30 run_app_for_context(hostpolicy_context_t const&, int, char const**) + 1500
29  libhostpolicy.dylib           	       0x104aa0920 corehost_main + 320
30  libhostfxr.dylib              	       0x1049c8158 fx_muxer_t::handle_exec_host_command(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, host_startup_info_t const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::unordered_map<known_options, std::__1::vector<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, std::__1::allocator<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>>>, known_options_hash, std::__1::equal_to<known_options>, std::__1::allocator<std::__1::pair<known_options const, std::__1::vector<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, std::__1::allocator<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>>>>>> const&, int, char const**, int, host_mode_t, bool, char*, int, int*) + 1144
31  libhostfxr.dylib              	       0x1049c74c4 fx_muxer_t::execute(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, int, char const**, host_startup_info_t const&, char*, int, int*) + 872
32  libhostfxr.dylib              	       0x1049c2210 hostfxr_main_startupinfo + 128
33  TrashMailPanda                	       0x1048e22e4 exe_start(int, char const**) + 1368
34  TrashMailPanda                	       0x1048e25b0 main + 184
35  dyld                          	       0x1945beb98 start + 6076

Thread 1:
0   libsystem_kernel.dylib        	       0x19491cc34 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x19492f3a0 mach_msg2_internal + 76
2   libsystem_kernel.dylib        	       0x194925764 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x19491cfa8 mach_msg + 24
4   libcoreclr.dylib              	       0x10540124c MachMessage::Receive(unsigned int) + 80
5   libcoreclr.dylib              	       0x105400574 SEHExceptionThread(void*) + 164
6   libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
7   libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 2:: .NET SynchManager
0   libsystem_kernel.dylib        	       0x194925498 poll + 8
1   libcoreclr.dylib              	       0x1053f4b18 CorUnix::CPalSynchronizationManager::WorkerThread(void*) + 916
2   libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
3   libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
4   libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 3:: .NET EventPipe
0   libsystem_kernel.dylib        	       0x194925498 poll + 8
1   libcoreclr.dylib              	       0x105731a1c ds_ipc_poll(_DiagnosticsIpcPollHandle*, unsigned long, unsigned int, void (*)(char const*, unsigned int)) + 172
2   libcoreclr.dylib              	       0x1056b36a0 ds_ipc_stream_factory_get_next_available_stream(void (*)(char const*, unsigned int)) + 756
3   libcoreclr.dylib              	       0x1056b78f4 server_thread(void*) + 372
4   libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
5   libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
6   libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 4:: .NET DebugPipe
0   libsystem_kernel.dylib        	       0x19491d678 __open + 8
1   libsystem_kernel.dylib        	       0x1949286a4 open + 64
2   libcoreclr.dylib              	       0x1057313dc TwoWayPipe::WaitForConnection() + 40
3   libcoreclr.dylib              	       0x10572cd7c DbgTransportSession::TransportWorker() + 232
4   libcoreclr.dylib              	       0x10572bdc8 DbgTransportSession::TransportWorkerStatic(void*) + 40
5   libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
6   libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
7   libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 5:: .NET Debugger
0   libsystem_kernel.dylib        	       0x1949203cc __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x19495f0e0 _pthread_cond_wait + 984
2   libcoreclr.dylib              	       0x1053f2de0 CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*) + 320
3   libcoreclr.dylib              	       0x1053f2a60 CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*) + 380
4   libcoreclr.dylib              	       0x1053f6f10 CorUnix::InternalWaitForMultipleObjectsEx(CorUnix::CPalThread*, unsigned int, void* const*, int, unsigned int, int, int) + 1604
5   libcoreclr.dylib              	       0x10572a60c DebuggerRCThread::MainLoop() + 228
6   libcoreclr.dylib              	       0x10572a4d4 DebuggerRCThread::ThreadProc() + 256
7   libcoreclr.dylib              	       0x10572a288 DebuggerRCThread::ThreadProcStatic(void*) + 56
8   libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
9   libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
10  libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 6:
0   libsystem_kernel.dylib        	       0x1949203cc __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x19495f0e0 _pthread_cond_wait + 984
2   libcoreclr.dylib              	       0x1053f2d8c CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*) + 236
3   libcoreclr.dylib              	       0x1053f2a60 CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*) + 380
4   libcoreclr.dylib              	       0x1053f6f10 CorUnix::InternalWaitForMultipleObjectsEx(CorUnix::CPalThread*, unsigned int, void* const*, int, unsigned int, int, int) + 1604
5   libcoreclr.dylib              	       0x1053f70c8 WaitForSingleObjectEx + 80
6   libcoreclr.dylib              	       0x1055c24c8 CLREventBase::WaitEx(unsigned int, WaitMode, PendingSync*) + 188
7   libcoreclr.dylib              	       0x105543bf4 FinalizerThread::WaitForFinalizerEvent(CLREvent*) + 48
8   libcoreclr.dylib              	       0x105543e10 FinalizerThread::FinalizerThreadWorker(void*) + 284
9   libcoreclr.dylib              	       0x1054e24a8 ManagedThreadBase_DispatchOuter(ManagedThreadCallState*) + 248
10  libcoreclr.dylib              	       0x1054e2978 ManagedThreadBase::FinalizerBase(void (*)(void*)) + 36
11  libcoreclr.dylib              	       0x105543f7c FinalizerThread::FinalizerThreadStart(void*) + 88
12  libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
13  libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
14  libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 7:
0   libsystem_kernel.dylib        	       0x1949203cc __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x19495f0e0 _pthread_cond_wait + 984
2   libcoreclr.dylib              	       0x1053f2d8c CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*) + 236
3   libcoreclr.dylib              	       0x1053f2a60 CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*) + 380
4   libcoreclr.dylib              	       0x1053f7678 SleepEx + 160
5   libcoreclr.dylib              	       0x1054e59a4 TieredCompilationManager::BackgroundWorkerStart() + 184
6   libcoreclr.dylib              	       0x1054e5870 TieredCompilationManager::BackgroundWorkerBootstrapper1(void*) + 88
7   libcoreclr.dylib              	       0x1054e24a8 ManagedThreadBase_DispatchOuter(ManagedThreadCallState*) + 248
8   libcoreclr.dylib              	       0x1054e2948 ManagedThreadBase::KickOff(void (*)(void*), void*) + 32
9   libcoreclr.dylib              	       0x1054e57ac TieredCompilationManager::BackgroundWorkerBootstrapper0(void*) + 40
10  libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
11  libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
12  libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 8:
0   libsystem_pthread.dylib       	       0x194959b6c start_wqthread + 0

Thread 9:
0   libsystem_pthread.dylib       	       0x194959b6c start_wqthread + 0

Thread 10:
0   libsystem_kernel.dylib        	       0x1949203cc __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x19495f0e0 _pthread_cond_wait + 984
2   libcoreclr.dylib              	       0x1053f2de0 CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*) + 320
3   libcoreclr.dylib              	       0x1053f2a60 CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*) + 380
4   libcoreclr.dylib              	       0x1053f6f10 CorUnix::InternalWaitForMultipleObjectsEx(CorUnix::CPalThread*, unsigned int, void* const*, int, unsigned int, int, int) + 1604
5   libcoreclr.dylib              	       0x1054df150 Thread::DoAppropriateWaitWorker(int, void**, int, unsigned int, WaitMode, void*) + 1160
6   libcoreclr.dylib              	       0x1054da95c Thread::DoAppropriateWait(int, void**, int, unsigned int, WaitMode, PendingSync*) + 136
7   libcoreclr.dylib              	       0x10552a1ec WaitHandleNative::CorWaitOneNative(void*, int, int) + 216
8   ???                           	       0x107f56d90 ???
9   ???                           	       0x108de6cbc ???
10  ???                           	       0x107f51ec0 ???
11  libcoreclr.dylib              	       0x10568bab0 CallDescrWorkerInternal + 132
12  libcoreclr.dylib              	       0x10550f3e8 DispatchCallSimple(unsigned long*, unsigned int, unsigned long, unsigned int) + 264
13  libcoreclr.dylib              	       0x1055218f0 ThreadNative::KickOffThread_Worker(void*) + 148
14  libcoreclr.dylib              	       0x1054e24a8 ManagedThreadBase_DispatchOuter(ManagedThreadCallState*) + 248
15  libcoreclr.dylib              	       0x1054e2948 ManagedThreadBase::KickOff(void (*)(void*), void*) + 32
16  libcoreclr.dylib              	       0x1055219f0 ThreadNative::KickOffThread(void*) + 212
17  libcoreclr.dylib              	       0x1053fde2c CorUnix::CPalThread::ThreadEntry(void*) + 364
18  libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
19  libsystem_pthread.dylib       	       0x194959b80 thread_start + 8

Thread 11:: CVDisplayLink
0   libsystem_kernel.dylib        	       0x1949203cc __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x19495f10c _pthread_cond_wait + 1028
2   CoreVideo                     	       0x19e2f31f4 CVDisplayLink::waitUntil(unsigned long long) + 336
3   CoreVideo                     	       0x19e2f22dc CVDisplayLink::runIOThread() + 500
4   libsystem_pthread.dylib       	       0x19495ec0c _pthread_start + 136
5   libsystem_pthread.dylib       	       0x194959b80 thread_start + 8


Thread 0 crashed with ARM Thread State (64-bit):
    x0: 0x0000000000000000   x1: 0x0000000000000000   x2: 0x0000000000000000   x3: 0x0000000000000000
    x4: 0x0000000000000000   x5: 0x00000000000000a0   x6: 0x0000000000000001   x7: 0x000000003b9ac618
    x8: 0x92f5e9c02723d426   x9: 0x92f5e9c225850b26  x10: 0x0000000000000000  x11: 0x000000010586a1f0
   x12: 0x0000000000000000  x13: 0x0000000000000000  x14: 0x0000000000000000  x15: 0x0000000000000000
   x16: 0x0000000000000148  x17: 0x0000000203abdfa8  x18: 0x0000000000000000  x19: 0x0000000000000006
   x20: 0x0000000000000103  x21: 0x0000000202a6dfe0  x22: 0x000000016b51c3d0  x23: 0x000000016b51c1d8
   x24: 0x000000016b51c1e8  x25: 0x000000013cf05b68  x26: 0x0000000000000000  x27: 0x0000000000000000
   x28: 0x000000016b51e120   fp: 0x000000016b51bef0   lr: 0x000000019495e88c
    sp: 0x000000016b51bed0   pc: 0x0000000194925388 cpsr: 0x40001000
   far: 0x0000000000000000  esr: 0x56000080  Address size fault

Binary Images:
       0x1048e0000 -        0x1048ebfff TrashMailPanda (*) <c6e3fdec-2492-33b0-a29d-9554351a9b9f> /Users/USER/*/TrashMailPanda
       0x1049b8000 -        0x1049f3fff libhostfxr.dylib (*) <f390c7c9-e7c8-345f-9969-d9faac23dc1e> /usr/local/share/dotnet/host/fxr/9.0.2/libhostfxr.dylib
       0x104a84000 -        0x104abffff libhostpolicy.dylib (*) <2259a435-508c-368d-8ffa-afdddebe108e> /usr/local/share/dotnet/shared/Microsoft.NETCore.App/9.0.2/libhostpolicy.dylib
       0x1053cc000 -        0x105843fff libcoreclr.dylib (*) <85d650bb-0e49-3c2e-9930-4cababb45bea> /usr/local/share/dotnet/shared/Microsoft.NETCore.App/9.0.2/libcoreclr.dylib
       0x104a1c000 -        0x104a2bfff libSystem.Native.dylib (*) <9d341b71-eff7-37fb-bd4d-88800236f3ae> /usr/local/share/dotnet/shared/Microsoft.NETCore.App/9.0.2/libSystem.Native.dylib
       0x107074000 -        0x1072b3fff libclrjit.dylib (*) <12d7c253-3091-3f82-88d0-047c4d033a5b> /usr/local/share/dotnet/shared/Microsoft.NETCore.App/9.0.2/libclrjit.dylib
       0x12f800000 -        0x12fe43fff libSkiaSharp.dylib (*) <95108746-a0e2-3bfd-bcae-b920e98fd0f7> /Users/USER/*/libSkiaSharp.dylib
       0x10790c000 -        0x10794bfff libAvaloniaNative.dylib (*) <89719fc2-3baf-3472-9567-da1a872c8055> /Users/USER/*/libAvaloniaNative.dylib
       0x13be70000 -        0x13bed7fff com.apple.AppleMetalOpenGLRenderer (1.0) <18efb0a5-0faf-3b56-99ed-a800c68e83f2> /System/Library/Extensions/AppleMetalOpenGLRenderer.bundle/Contents/MacOS/AppleMetalOpenGLRenderer
       0x13f000000 -        0x13f697fff com.apple.AGXMetalG13X (327.5) <a459e0d8-5ddb-360f-817e-bc708b1711b0> /System/Library/Extensions/AGXMetalG13X.bundle/Contents/MacOS/AGXMetalG13X
       0x19491c000 -        0x194957653 libsystem_kernel.dylib (*) <60485b6f-67e5-38c1-aec9-efd6031ff166> /usr/lib/system/libsystem_kernel.dylib
       0x194958000 -        0x194964a47 libsystem_pthread.dylib (*) <647b91fc-96d3-3bbb-af08-970df45257c8> /usr/lib/system/libsystem_pthread.dylib
       0x1947ef000 -        0x19487046f libsystem_c.dylib (*) <f4529d5e-24f3-3bbb-bd3c-984856875fc8> /usr/lib/system/libsystem_c.dylib
               0x0 - 0xffffffffffffffff ??? (*) <00000000-0000-0000-0000-000000000000> ???
       0x1945b8000 -        0x1946534cf dyld (*) <9cf0401a-a938-389e-a77d-9e9608076ccf> /usr/lib/dyld
       0x19e2f0000 -        0x19e350ddf com.apple.CoreVideo (1.8) <54956113-d920-3d30-b023-f4f1419e7441> /System/Library/Frameworks/CoreVideo.framework/Versions/A/CoreVideo

External Modification Summary:
  Calls made by other processes targeting this process:
    task_for_pid: 0
    thread_create: 0
    thread_set_state: 0
  Calls made by this process:
    task_for_pid: 0
    thread_create: 0
    thread_set_state: 0
  Calls made by all processes on this machine:
    task_for_pid: 0
    thread_create: 0
    thread_set_state: 0

VM Region Summary:
ReadOnly portion of Libraries: Total=930.5M resident=0K(0%) swapped_out_or_unallocated=930.5M(100%)
Writable regions: Total=1.1G written=514K(0%) resident=514K(0%) swapped_out=0K(0%) unallocated=1.1G(100%)

                                VIRTUAL   REGION 
REGION TYPE                        SIZE    COUNT (non-coalesced) 
===========                     =======  ======= 
Activity Tracing                   256K        1 
ColorSync                          464K       24 
CoreGraphics                        32K        2 
Kernel Alloc Once                   32K        1 
MALLOC                             1.1G       34 
MALLOC guard page                  192K       12 
STACK GUARD                       56.2M       12 
Stack                             20.3M       12 
VM_ALLOCATE                        1.1G      159 
__AUTH                            1169K      214 
__AUTH_CONST                      25.0M      370 
__DATA                            5312K      363 
__DATA_CONST                      16.2M      382 
__DATA_DIRTY                       699K      109 
__FONT_DATA                        2352        1 
__GLSLBUILTINS                    5174K        1 
__LINKEDIT                       620.2M       11 
__OBJC_RO                         61.4M        1 
__OBJC_RW                         2396K        1 
__TEXT                           310.3M      395 
__TEXT (graphics)                 4832K        2 
__TPRO_CONST                       128K        2 
mapped file                       89.7M       88 
page table in kernel               514K        1 
shared memory                      864K       14 
===========                     =======  ======= 
TOTAL                              3.4G     2212 



-----------
Full Report
-----------

{"app_name":"TrashMailPanda","timestamp":"2025-09-01 11:06:44.00 -0600","app_version":"","slice_uuid":"c6e3fdec-2492-33b0-a29d-9554351a9b9f","build_version":"","platform":1,"share_with_app_devs":1,"is_first_party":1,"bug_type":"309","os_version":"macOS 15.5 (24F74)","roots_installed":0,"incident_id":"CF0B19F1-8A6C-45DF-868C-FFC21EE1A3D0","name":"TrashMailPanda"}
{
  "uptime" : 98000,
  "procRole" : "Background",
  "version" : 2,
  "userID" : 501,
  "deployVersion" : 210,
  "modelCode" : "MacBookPro18,3",
  "coalitionID" : 807,
  "osVersion" : {
    "train" : "macOS 15.5",
    "build" : "24F74",
    "releaseType" : "User"
  },
  "captureTime" : "2025-09-01 11:06:42.4175 -0600",
  "codeSigningMonitor" : 1,
  "incident" : "CF0B19F1-8A6C-45DF-868C-FFC21EE1A3D0",
  "pid" : 79622,
  "translated" : false,
  "cpuType" : "ARM-64",
  "roots_installed" : 0,
  "bug_type" : "309",
  "procLaunch" : "2025-09-01 11:06:41.9091 -0600",
  "procStartAbsTime" : 2363255109101,
  "procExitAbsTime" : 2363267251283,
  "procName" : "TrashMailPanda",
  "procPath" : "\/Users\/USER\/*\/TrashMailPanda",
  "parentProc" : "dotnet",
  "parentPid" : 79605,
  "coalitionName" : "dev.warp.Warp-Stable",
  "crashReporterKey" : "6E786EDD-1862-5B8C-FEFD-5B3B6F24CC06",
  "appleIntelligenceStatus" : {"state":"available"},
  "responsiblePid" : 731,
  "responsibleProc" : "stable",
  "codeSigningID" : "apphost-55554944c6e3fdec249233b0a29d9554351a9b9f",
  "codeSigningTeamID" : "",
  "codeSigningFlags" : 570425857,
  "codeSigningValidationCategory" : 10,
  "codeSigningTrustLevel" : 4294967295,
  "codeSigningAuxiliaryInfo" : 0,
  "instructionByteStream" : {"beforePC":"fyMD1f17v6n9AwCRm+D\/l78DAJH9e8Go\/w9f1sADX9YQKYDSARAA1A==","atPC":"AwEAVH8jA9X9e7+p\/QMAkZDg\/5e\/AwCR\/XvBqP8PX9bAA1\/WcAqA0g=="},
  "bootSessionUUID" : "B36D33F3-29DD-4072-82D8-6B0239998DFC",
  "wakeTime" : 662,
  "sleepWakeUUID" : "712CAB6D-E025-4396-8599-F190827ECDE7",
  "sip" : "enabled",
  "exception" : {"codes":"0x0000000000000000, 0x0000000000000000","rawCodes":[0,0],"type":"EXC_CRASH","signal":"SIGABRT"},
  "termination" : {"flags":0,"code":6,"namespace":"SIGNAL","indicator":"Abort trap: 6","byProc":"TrashMailPanda","byPid":79622},
  "asi" : {"libsystem_c.dylib":["abort() called"]},
  "extMods" : {"caller":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"system":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"targeted":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"warnings":0},
  "faultingThread" : 0,
  "threads" : [{"triggered":true,"id":2478222,"threadState":{"x":[{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":1},{"value":999999000},{"value":10589627110331241510},{"value":10589627118893992742},{"value":0},{"value":4387676656,"symbolLocation":8,"symbol":"SharedMemoryManager::s_creationDeletionProcessLock"},{"value":0},{"value":0},{"value":0},{"value":0},{"value":328},{"value":8651530152},{"value":0},{"value":6},{"value":259},{"value":8634425312,"symbolLocation":224,"symbol":"_main_thread"},{"value":6095487952},{"value":6095487448},{"value":6095487464},{"value":5317352296},{"value":0},{"value":0},{"value":6095495456}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787819660},"cpsr":{"value":1073745920},"fp":{"value":6095486704},"sp":{"value":6095486672},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787584904,"matchesCrashFrame":1},"far":{"value":0}},"queue":"com.apple.main-thread","frames":[{"imageOffset":37768,"symbol":"__pthread_kill","symbolLocation":8,"imageIndex":10},{"imageOffset":26764,"symbol":"pthread_kill","symbolLocation":296,"imageIndex":11},{"imageOffset":494688,"symbol":"abort","symbolLocation":124,"imageIndex":12},{"imageOffset":187652,"symbol":"PROCAbort","symbolLocation":72,"imageIndex":3},{"imageOffset":187408,"symbol":"TerminateProcess","symbolLocation":176,"imageIndex":3},{"imageOffset":2266096,"symbol":"SfiNext","symbolLocation":1388,"imageIndex":3},{"imageOffset":4428941380,"imageIndex":13},{"imageOffset":4428939080,"imageIndex":13},{"imageOffset":2882224,"symbol":"CallDescrWorkerInternal","symbolLocation":132,"imageIndex":3},{"imageOffset":1324008,"symbol":"DispatchCallSimple(unsigned long*, unsigned int, unsigned long, unsigned int)","symbolLocation":264,"imageIndex":3},{"imageOffset":2250852,"symbol":"DispatchManagedException(Object*, _CONTEXT*)","symbolLocation":320,"imageIndex":3},{"imageOffset":2251232,"symbol":"DispatchManagedException(Object*)","symbolLocation":40,"imageIndex":3},{"imageOffset":1669172,"symbol":"ThrowNew(Object*)","symbolLocation":180,"imageIndex":3},{"imageOffset":1669420,"symbol":"IL_Throw(Object*)","symbolLocation":180,"imageIndex":3},{"imageOffset":4443834724,"imageIndex":13},{"imageOffset":4443834376,"imageIndex":13},{"imageOffset":4443830760,"imageIndex":13},{"imageOffset":4443633736,"imageIndex":13},{"imageOffset":4443632804,"imageIndex":13},{"imageOffset":4443632136,"imageIndex":13},{"imageOffset":4443503268,"imageIndex":13},{"imageOffset":4443413680,"imageIndex":13},{"imageOffset":2882224,"symbol":"CallDescrWorkerInternal","symbolLocation":132,"imageIndex":3},{"imageOffset":1324940,"symbol":"MethodDescCallSite::CallTargetWorker(unsigned long long const*, unsigned long long*, int)","symbolLocation":832,"imageIndex":3},{"imageOffset":293724,"symbol":"RunMain(MethodDesc*, short, int*, PtrArray**)","symbolLocation":624,"imageIndex":3},{"imageOffset":294584,"symbol":"Assembly::ExecuteMainMethod(PtrArray**, int)","symbolLocation":268,"imageIndex":3},{"imageOffset":443644,"symbol":"CorHost2::ExecuteAssembly(unsigned int, char16_t const*, int, char16_t const**, unsigned int*)","symbolLocation":640,"imageIndex":3},{"imageOffset":226676,"symbol":"coreclr_execute_assembly","symbolLocation":232,"imageIndex":3},{"imageOffset":113456,"symbol":"run_app_for_context(hostpolicy_context_t const&, int, char const**)","symbolLocation":1500,"imageIndex":2},{"imageOffset":117024,"symbol":"corehost_main","symbolLocation":320,"imageIndex":2},{"imageOffset":65880,"symbol":"fx_muxer_t::handle_exec_host_command(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, host_startup_info_t const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::unordered_map<known_options, std::__1::vector<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, std::__1::allocator<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>>>, known_options_hash, std::__1::equal_to<known_options>, std::__1::allocator<std::__1::pair<known_options const, std::__1::vector<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, std::__1::allocator<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>>>>>> const&, int, char const**, int, host_mode_t, bool, char*, int, int*)","symbolLocation":1144,"imageIndex":1},{"imageOffset":62660,"symbol":"fx_muxer_t::execute(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, int, char const**, host_startup_info_t const&, char*, int, int*)","symbolLocation":872,"imageIndex":1},{"imageOffset":41488,"symbol":"hostfxr_main_startupinfo","symbolLocation":128,"imageIndex":1},{"imageOffset":8932,"symbol":"exe_start(int, char const**)","symbolLocation":1368,"imageIndex":0},{"imageOffset":9648,"symbol":"main","symbolLocation":184,"imageIndex":0},{"imageOffset":27544,"symbol":"start","symbolLocation":6076,"imageIndex":14}]},{"id":2478223,"frames":[{"imageOffset":3124,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":10},{"imageOffset":78752,"symbol":"mach_msg2_internal","symbolLocation":76,"imageIndex":10},{"imageOffset":38756,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":10},{"imageOffset":4008,"symbol":"mach_msg","symbolLocation":24,"imageIndex":10},{"imageOffset":217676,"symbol":"MachMessage::Receive(unsigned int)","symbolLocation":80,"imageIndex":3},{"imageOffset":214388,"symbol":"SEHExceptionThread(void*)","symbolLocation":164,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}],"threadState":{"x":[{"value":268451845},{"value":17179869190},{"value":0},{"value":0},{"value":0},{"value":30799210479616},{"value":5356},{"value":0},{"value":0},{"value":17179869184},{"value":5356},{"value":0},{"value":0},{"value":0},{"value":7171},{"value":0},{"value":18446744073709551569},{"value":8651530296},{"value":0},{"value":0},{"value":5356},{"value":30799210479616},{"value":0},{"value":0},{"value":6096043064},{"value":0},{"value":17179869190},{"value":18446744073709550527},{"value":6}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787625888},"cpsr":{"value":4096},"fp":{"value":6096040224},"sp":{"value":6096040144},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787550260},"far":{"value":0}}},{"id":2478224,"name":".NET SynchManager","threadState":{"x":[{"value":4},{"value":0},{"value":4294967295},{"value":257},{"value":1103806595328},{"value":256},{"value":0},{"value":0},{"value":5326879832},{"value":2},{"value":0},{"value":2},{"value":256},{"value":256},{"value":0},{"value":0},{"value":230},{"value":256},{"value":0},{"value":5326879800},{"value":5326879232},{"value":0},{"value":1},{"value":250},{"value":0},{"value":1000},{"value":3},{"value":4387677416,"symbolLocation":0,"symbol":"CorUnix::CPalSynchronizationManager::s_csSynchProcessLock"},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4383001368},"cpsr":{"value":1610616832},"fp":{"value":6097678224},"sp":{"value":6097678096},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787585176},"far":{"value":0}},"frames":[{"imageOffset":38040,"symbol":"poll","symbolLocation":8,"imageIndex":10},{"imageOffset":166680,"symbol":"CorUnix::CPalSynchronizationManager::WorkerThread(void*)","symbolLocation":916,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}]},{"id":2478225,"name":".NET EventPipe","threadState":{"x":[{"value":4},{"value":0},{"value":4294967295},{"value":1096599146},{"value":3},{"value":2497636387},{"value":544},{"value":110},{"value":1},{"value":1},{"value":9},{"value":105553160569376},{"value":16},{"value":105553160605864},{"value":2095104},{"value":2043},{"value":230},{"value":34},{"value":0},{"value":105553160569376},{"value":1},{"value":5317363744},{"value":4385955660,"symbolLocation":0,"symbol":"server_warning_callback(char const*, unsigned int)"},{"value":4294967295},{"value":4387333802,"symbolLocation":21942,"symbol":"GetStringizedTypeLibGuidForAssembly(Assembly*, CQuickArray<unsigned char>&, unsigned int, unsigned int*)::szTypeLibKeyName"},{"value":500},{"value":1},{"value":4294967295},{"value":6099299792}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4386396700},"cpsr":{"value":1610616832},"fp":{"value":6099299696},"sp":{"value":6099299616},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787585176},"far":{"value":0}},"frames":[{"imageOffset":38040,"symbol":"poll","symbolLocation":8,"imageIndex":10},{"imageOffset":3562012,"symbol":"ds_ipc_poll(_DiagnosticsIpcPollHandle*, unsigned long, unsigned int, void (*)(char const*, unsigned int))","symbolLocation":172,"imageIndex":3},{"imageOffset":3045024,"symbol":"ds_ipc_stream_factory_get_next_available_stream(void (*)(char const*, unsigned int))","symbolLocation":756,"imageIndex":3},{"imageOffset":3062004,"symbol":"server_thread(void*)","symbolLocation":372,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}]},{"id":2478226,"name":".NET DebugPipe","threadState":{"x":[{"value":4},{"value":0},{"value":0},{"value":6100922463},{"value":105553160569776},{"value":14},{"value":0},{"value":98},{"value":1},{"value":5317378388},{"value":5317377612},{"value":944},{"value":2043},{"value":2045},{"value":2763923516},{"value":2761826299},{"value":5},{"value":60},{"value":0},{"value":0},{"value":5317377852},{"value":5317377840},{"value":0},{"value":0},{"value":0},{"value":1},{"value":5317377824},{"value":6100920736},{"value":4387032000,"symbolLocation":1092,"symbol":"(anonymous namespace)::g_shash_primes"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787597988},"cpsr":{"value":1610616832},"fp":{"value":6100920512},"sp":{"value":6100920464},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787552888},"far":{"value":0}},"frames":[{"imageOffset":5752,"symbol":"__open","symbolLocation":8,"imageIndex":10},{"imageOffset":50852,"symbol":"open","symbolLocation":64,"imageIndex":10},{"imageOffset":3560412,"symbol":"TwoWayPipe::WaitForConnection()","symbolLocation":40,"imageIndex":3},{"imageOffset":3542396,"symbol":"DbgTransportSession::TransportWorker()","symbolLocation":232,"imageIndex":3},{"imageOffset":3538376,"symbol":"DbgTransportSession::TransportWorkerStatic(void*)","symbolLocation":40,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}]},{"id":2478227,"name":".NET Debugger","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6102543256},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":8651530080},{"value":0},{"value":5083530296},{"value":5083530360},{"value":6102544608},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":105553160667136},{"value":4294967295}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787821792},"cpsr":{"value":1610616832},"fp":{"value":6102543376},"sp":{"value":6102543232},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787564492},"far":{"value":0}},"frames":[{"imageOffset":17356,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":10},{"imageOffset":28896,"symbol":"_pthread_cond_wait","symbolLocation":984,"imageIndex":11},{"imageOffset":159200,"symbol":"CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":320,"imageIndex":3},{"imageOffset":158304,"symbol":"CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":380,"imageIndex":3},{"imageOffset":175888,"symbol":"CorUnix::InternalWaitForMultipleObjectsEx(CorUnix::CPalThread*, unsigned int, void* const*, int, unsigned int, int, int)","symbolLocation":1604,"imageIndex":3},{"imageOffset":3532300,"symbol":"DebuggerRCThread::MainLoop()","symbolLocation":228,"imageIndex":3},{"imageOffset":3531988,"symbol":"DebuggerRCThread::ThreadProc()","symbolLocation":256,"imageIndex":3},{"imageOffset":3531400,"symbol":"DebuggerRCThread::ThreadProcStatic(void*)","symbolLocation":56,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}]},{"id":2478228,"frames":[{"imageOffset":17356,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":10},{"imageOffset":28896,"symbol":"_pthread_cond_wait","symbolLocation":984,"imageIndex":11},{"imageOffset":159116,"symbol":"CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":236,"imageIndex":3},{"imageOffset":158304,"symbol":"CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":380,"imageIndex":3},{"imageOffset":175888,"symbol":"CorUnix::InternalWaitForMultipleObjectsEx(CorUnix::CPalThread*, unsigned int, void* const*, int, unsigned int, int, int)","symbolLocation":1604,"imageIndex":3},{"imageOffset":176328,"symbol":"WaitForSingleObjectEx","symbolLocation":80,"imageIndex":3},{"imageOffset":2057416,"symbol":"CLREventBase::WaitEx(unsigned int, WaitMode, PendingSync*)","symbolLocation":188,"imageIndex":3},{"imageOffset":1539060,"symbol":"FinalizerThread::WaitForFinalizerEvent(CLREvent*)","symbolLocation":48,"imageIndex":3},{"imageOffset":1539600,"symbol":"FinalizerThread::FinalizerThreadWorker(void*)","symbolLocation":284,"imageIndex":3},{"imageOffset":1139880,"symbol":"ManagedThreadBase_DispatchOuter(ManagedThreadCallState*)","symbolLocation":248,"imageIndex":3},{"imageOffset":1141112,"symbol":"ManagedThreadBase::FinalizerBase(void (*)(void*))","symbolLocation":36,"imageIndex":3},{"imageOffset":1539964,"symbol":"FinalizerThread::FinalizerThreadStart(void*)","symbolLocation":88,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}],"threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":1},{"value":999999000},{"value":6104164248},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":8651530080},{"value":0},{"value":5326987320},{"value":5326987384},{"value":6104166624},{"value":999999000},{"value":1},{"value":0},{"value":1},{"value":256},{"value":105553160569872},{"value":2000}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787821792},"cpsr":{"value":1610616832},"fp":{"value":6104164368},"sp":{"value":6104164224},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787564492},"far":{"value":0}}},{"id":2478230,"frames":[{"imageOffset":17356,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":10},{"imageOffset":28896,"symbol":"_pthread_cond_wait","symbolLocation":984,"imageIndex":11},{"imageOffset":159116,"symbol":"CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":236,"imageIndex":3},{"imageOffset":158304,"symbol":"CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":380,"imageIndex":3},{"imageOffset":177784,"symbol":"SleepEx","symbolLocation":160,"imageIndex":3},{"imageOffset":1153444,"symbol":"TieredCompilationManager::BackgroundWorkerStart()","symbolLocation":184,"imageIndex":3},{"imageOffset":1153136,"symbol":"TieredCompilationManager::BackgroundWorkerBootstrapper1(void*)","symbolLocation":88,"imageIndex":3},{"imageOffset":1139880,"symbol":"ManagedThreadBase_DispatchOuter(ManagedThreadCallState*)","symbolLocation":248,"imageIndex":3},{"imageOffset":1141064,"symbol":"ManagedThreadBase::KickOff(void (*)(void*), void*)","symbolLocation":32,"imageIndex":3},{"imageOffset":1152940,"symbol":"TieredCompilationManager::BackgroundWorkerBootstrapper0(void*)","symbolLocation":40,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}],"threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":100000000},{"value":6105787400},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":8651530080},{"value":0},{"value":5327004216},{"value":5327004280},{"value":6105788640},{"value":100000000},{"value":0},{"value":0},{"value":769},{"value":1024},{"value":105553160570096},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787821792},"cpsr":{"value":1610616832},"fp":{"value":6105787520},"sp":{"value":6105787376},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787564492},"far":{"value":0}}},{"id":2478241,"frames":[{"imageOffset":7020,"symbol":"start_wqthread","symbolLocation":0,"imageIndex":11}],"threadState":{"x":[{"value":6106361856},{"value":8707},{"value":6105825280},{"value":0},{"value":409602},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":4096},"fp":{"value":0},"sp":{"value":6106361856},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787799916},"far":{"value":0}}},{"id":2478242,"frames":[{"imageOffset":7020,"symbol":"start_wqthread","symbolLocation":0,"imageIndex":11}],"threadState":{"x":[{"value":6106935296},{"value":16131},{"value":6106398720},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":4096},"fp":{"value":0},"sp":{"value":6106935296},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787799916},"far":{"value":0}}},{"id":2478265,"frames":[{"imageOffset":17356,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":10},{"imageOffset":28896,"symbol":"_pthread_cond_wait","symbolLocation":984,"imageIndex":11},{"imageOffset":159200,"symbol":"CorUnix::CPalSynchronizationManager::ThreadNativeWait(CorUnix::_ThreadNativeWaitData*, unsigned int, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":320,"imageIndex":3},{"imageOffset":158304,"symbol":"CorUnix::CPalSynchronizationManager::BlockThread(CorUnix::CPalThread*, unsigned int, bool, bool, CorUnix::ThreadWakeupReason*, unsigned int*)","symbolLocation":380,"imageIndex":3},{"imageOffset":175888,"symbol":"CorUnix::InternalWaitForMultipleObjectsEx(CorUnix::CPalThread*, unsigned int, void* const*, int, unsigned int, int, int)","symbolLocation":1604,"imageIndex":3},{"imageOffset":1126736,"symbol":"Thread::DoAppropriateWaitWorker(int, void**, int, unsigned int, WaitMode, void*)","symbolLocation":1160,"imageIndex":3},{"imageOffset":1108316,"symbol":"Thread::DoAppropriateWait(int, void**, int, unsigned int, WaitMode, PendingSync*)","symbolLocation":136,"imageIndex":3},{"imageOffset":1434092,"symbol":"WaitHandleNative::CorWaitOneNative(void*, int, int)","symbolLocation":216,"imageIndex":3},{"imageOffset":4428492176,"imageIndex":13},{"imageOffset":4443761852,"imageIndex":13},{"imageOffset":4428472000,"imageIndex":13},{"imageOffset":2882224,"symbol":"CallDescrWorkerInternal","symbolLocation":132,"imageIndex":3},{"imageOffset":1324008,"symbol":"DispatchCallSimple(unsigned long*, unsigned int, unsigned long, unsigned int)","symbolLocation":264,"imageIndex":3},{"imageOffset":1399024,"symbol":"ThreadNative::KickOffThread_Worker(void*)","symbolLocation":148,"imageIndex":3},{"imageOffset":1139880,"symbol":"ManagedThreadBase_DispatchOuter(ManagedThreadCallState*)","symbolLocation":248,"imageIndex":3},{"imageOffset":1141064,"symbol":"ManagedThreadBase::KickOff(void (*)(void*), void*)","symbolLocation":32,"imageIndex":3},{"imageOffset":1399280,"symbol":"ThreadNative::KickOffThread(void*)","symbolLocation":212,"imageIndex":3},{"imageOffset":204332,"symbol":"CorUnix::CPalThread::ThreadEntry(void*)","symbolLocation":364,"imageIndex":3},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}],"threadState":{"x":[{"value":260},{"value":0},{"value":768},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6108030056},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":8651530080},{"value":0},{"value":5343686712},{"value":5343686776},{"value":6108033248},{"value":0},{"value":0},{"value":768},{"value":769},{"value":1024},{"value":105553160587584},{"value":4294967295}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787821792},"cpsr":{"value":1610616832},"fp":{"value":6108030176},"sp":{"value":6108030032},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787564492},"far":{"value":0}}},{"id":2478266,"name":"CVDisplayLink","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":65704},{"value":0},{"value":7386459},{"value":1025},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":8651530080},{"value":0},{"value":5318589496},{"value":5318589560},{"value":1},{"value":7386459},{"value":0},{"value":0},{"value":1025},{"value":1280},{"value":2363267412951},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6787821836},"cpsr":{"value":2684358656},"fp":{"value":6108605872},"sp":{"value":6108605728},"esr":{"value":1442840704,"description":" Address size fault"},"pc":{"value":6787564492},"far":{"value":0}},"frames":[{"imageOffset":17356,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":10},{"imageOffset":28940,"symbol":"_pthread_cond_wait","symbolLocation":1028,"imageIndex":11},{"imageOffset":12788,"symbol":"CVDisplayLink::waitUntil(unsigned long long)","symbolLocation":336,"imageIndex":15},{"imageOffset":8924,"symbol":"CVDisplayLink::runIOThread()","symbolLocation":500,"imageIndex":15},{"imageOffset":27660,"symbol":"_pthread_start","symbolLocation":136,"imageIndex":11},{"imageOffset":7040,"symbol":"thread_start","symbolLocation":8,"imageIndex":11}]}],
  "usedImages" : [
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4371382272,
    "size" : 49152,
    "uuid" : "c6e3fdec-2492-33b0-a29d-9554351a9b9f",
    "path" : "\/Users\/USER\/*\/TrashMailPanda",
    "name" : "TrashMailPanda"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4372267008,
    "size" : 245760,
    "uuid" : "f390c7c9-e7c8-345f-9969-d9faac23dc1e",
    "path" : "\/usr\/local\/share\/dotnet\/host\/fxr\/9.0.2\/libhostfxr.dylib",
    "name" : "libhostfxr.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4373102592,
    "size" : 245760,
    "uuid" : "2259a435-508c-368d-8ffa-afdddebe108e",
    "path" : "\/usr\/local\/share\/dotnet\/shared\/Microsoft.NETCore.App\/9.0.2\/libhostpolicy.dylib",
    "name" : "libhostpolicy.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4382834688,
    "size" : 4685824,
    "uuid" : "85d650bb-0e49-3c2e-9930-4cababb45bea",
    "path" : "\/usr\/local\/share\/dotnet\/shared\/Microsoft.NETCore.App\/9.0.2\/libcoreclr.dylib",
    "name" : "libcoreclr.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4372676608,
    "size" : 65536,
    "uuid" : "9d341b71-eff7-37fb-bd4d-88800236f3ae",
    "path" : "\/usr\/local\/share\/dotnet\/shared\/Microsoft.NETCore.App\/9.0.2\/libSystem.Native.dylib",
    "name" : "libSystem.Native.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4412882944,
    "size" : 2359296,
    "uuid" : "12d7c253-3091-3f82-88d0-047c4d033a5b",
    "path" : "\/usr\/local\/share\/dotnet\/shared\/Microsoft.NETCore.App\/9.0.2\/libclrjit.dylib",
    "name" : "libclrjit.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 5091885056,
    "size" : 6569984,
    "uuid" : "95108746-a0e2-3bfd-bcae-b920e98fd0f7",
    "path" : "\/Users\/USER\/*\/libSkiaSharp.dylib",
    "name" : "libSkiaSharp.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4421894144,
    "size" : 262144,
    "uuid" : "89719fc2-3baf-3472-9567-da1a872c8055",
    "path" : "\/Users\/USER\/*\/libAvaloniaNative.dylib",
    "name" : "libAvaloniaNative.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 5299961856,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.AppleMetalOpenGLRenderer",
    "size" : 425984,
    "uuid" : "18efb0a5-0faf-3b56-99ed-a800c68e83f2",
    "path" : "\/System\/Library\/Extensions\/AppleMetalOpenGLRenderer.bundle\/Contents\/MacOS\/AppleMetalOpenGLRenderer",
    "name" : "AppleMetalOpenGLRenderer",
    "CFBundleVersion" : "1"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 5351931904,
    "CFBundleShortVersionString" : "327.5",
    "CFBundleIdentifier" : "com.apple.AGXMetalG13X",
    "size" : 6914048,
    "uuid" : "a459e0d8-5ddb-360f-817e-bc708b1711b0",
    "path" : "\/System\/Library\/Extensions\/AGXMetalG13X.bundle\/Contents\/MacOS\/AGXMetalG13X",
    "name" : "AGXMetalG13X",
    "CFBundleVersion" : "327.5"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 6787547136,
    "size" : 243284,
    "uuid" : "60485b6f-67e5-38c1-aec9-efd6031ff166",
    "path" : "\/usr\/lib\/system\/libsystem_kernel.dylib",
    "name" : "libsystem_kernel.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 6787792896,
    "size" : 51784,
    "uuid" : "647b91fc-96d3-3bbb-af08-970df45257c8",
    "path" : "\/usr\/lib\/system\/libsystem_pthread.dylib",
    "name" : "libsystem_pthread.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 6786314240,
    "size" : 529520,
    "uuid" : "f4529d5e-24f3-3bbb-bd3c-984856875fc8",
    "path" : "\/usr\/lib\/system\/libsystem_c.dylib",
    "name" : "libsystem_c.dylib"
  },
  {
    "size" : 0,
    "source" : "A",
    "base" : 0,
    "uuid" : "00000000-0000-0000-0000-000000000000"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 6783991808,
    "size" : 636112,
    "uuid" : "9cf0401a-a938-389e-a77d-9e9608076ccf",
    "path" : "\/usr\/lib\/dyld",
    "name" : "dyld"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 6948847616,
    "CFBundleShortVersionString" : "1.8",
    "CFBundleIdentifier" : "com.apple.CoreVideo",
    "size" : 396768,
    "uuid" : "54956113-d920-3d30-b023-f4f1419e7441",
    "path" : "\/System\/Library\/Frameworks\/CoreVideo.framework\/Versions\/A\/CoreVideo",
    "name" : "CoreVideo",
    "CFBundleVersion" : "682.6"
  }
],
  "sharedCache" : {
  "base" : 6783156224,
  "size" : 5047205888,
  "uuid" : "d7397d7f-8df9-3920-81a7-c0a144be9c51"
},
  "vmSummary" : "ReadOnly portion of Libraries: Total=930.5M resident=0K(0%) swapped_out_or_unallocated=930.5M(100%)\nWritable regions: Total=1.1G written=514K(0%) resident=514K(0%) swapped_out=0K(0%) unallocated=1.1G(100%)\n\n                                VIRTUAL   REGION \nREGION TYPE                        SIZE    COUNT (non-coalesced) \n===========                     =======  ======= \nActivity Tracing                   256K        1 \nColorSync                          464K       24 \nCoreGraphics                        32K        2 \nKernel Alloc Once                   32K        1 \nMALLOC                             1.1G       34 \nMALLOC guard page                  192K       12 \nSTACK GUARD                       56.2M       12 \nStack                             20.3M       12 \nVM_ALLOCATE                        1.1G      159 \n__AUTH                            1169K      214 \n__AUTH_CONST                      25.0M      370 \n__DATA                            5312K      363 \n__DATA_CONST                      16.2M      382 \n__DATA_DIRTY                       699K      109 \n__FONT_DATA                        2352        1 \n__GLSLBUILTINS                    5174K        1 \n__LINKEDIT                       620.2M       11 \n__OBJC_RO                         61.4M        1 \n__OBJC_RW                         2396K        1 \n__TEXT                           310.3M      395 \n__TEXT (graphics)                 4832K        2 \n__TPRO_CONST                       128K        2 \nmapped file                       89.7M       88 \npage table in kernel               514K        1 \nshared memory                      864K       14 \n===========                     =======  ======= \nTOTAL                              3.4G     2212 \n",
  "legacyInfo" : {
  "threadTriggered" : {
    "queue" : "com.apple.main-thread"
  }
},
  "logWritingSignature" : "ed863ae8fffb2c5cd8ea9a5c8214448f651dcd88",
  "trialInfo" : {
  "rollouts" : [
    {
      "rolloutId" : "64628732bf2f5257dedc8988",
      "factorPackIds" : {

      },
      "deploymentId" : 240000001
    },
    {
      "rolloutId" : "654439cdafbf5b61207873a9",
      "factorPackIds" : {

      },
      "deploymentId" : 240000004
    }
  ],
  "experiments" : [
    {
      "treatmentId" : "28060e10-d4e5-4163-aa2b-d8bd088d5cbf",
      "experimentId" : "6685b283afc7c17197d69eec",
      "deploymentId" : 400000012
    }
  ]
}
}

