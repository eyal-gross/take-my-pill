import sys, time
import numpy as np, soundfile as sf
import pyaudiowpatch as p
out, maxsec = sys.argv[1], float(sys.argv[2])
a = p.PyAudio(); d = a.get_default_wasapi_loopback()
rate, ch = int(d['defaultSampleRate']), d['maxInputChannels']
s = a.open(format=p.paFloat32, channels=ch, rate=rate, input=True, input_device_index=d['index'], frames_per_buffer=1024)
f = sf.SoundFile(out, 'w', samplerate=rate, channels=ch, subtype='FLOAT')
started, quiet, t0, n, peak = False, 0.0, time.time(), 0, 0.0
print('waiting for sound...', flush=True)
try:
    while True:
        try:
            x = np.frombuffer(s.read(1024, exception_on_overflow=False), np.float32).reshape(-1, ch)
        except OSError:
            print('device reset, reopening', flush=True)
            try: s.close()
            except Exception: pass
            time.sleep(0.5); d = a.get_default_wasapi_loopback()
            s = a.open(format=p.paFloat32, channels=ch, rate=rate, input=True, input_device_index=d['index'], frames_per_buffer=1024)
            continue
        loud = np.sqrt(np.mean(x ** 2)) > 0.001
        if not started:
            if loud: started = True; print('recording', flush=True)
            elif time.time() - t0 > 900: print('no sound in 15 min'); break
            else: continue
        f.write(x); n += len(x); peak = max(peak, float(np.abs(x).max()))
        quiet = 0 if loud else quiet + len(x) / rate
        if quiet > 15 or n / rate > maxsec: break
finally:
    f.close(); s.close(); a.terminate()
    print('saved %.1fs peak %.2f to %s' % (n / rate, peak, out), flush=True)
