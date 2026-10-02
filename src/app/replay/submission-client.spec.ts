import { ReplaySubmission, ReplaySubmissionClient } from './submission-client';
import { MAX_REPLAY_BYTES } from './validate-submission';

const submission = (): ReplaySubmission => ({
  bytes: new Uint8Array([0, 1, 255]), fileName: 'recording.rrf', appVersion: '0.1.157-beta',
  summary: { className: 'Executor', baseLevel: 240, jobLevel: 50, player: 'Tester', skippedItems: [] } as any,
  traits: null, traitsSource: null, nick: ' Credit ', discord: ' Contact ', notes: ' Notes ',
});
describe('replay submission client contract', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('commits metadata and the original bytes atomically with server timestamps', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    const id = await new ReplaySubmissionClient().submit(submission());
    expect(id).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{10}$/);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, request] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/documents:commit?key=');
    expect(request.method).toBe('POST');
    const { writes } = JSON.parse(request.body as string);
    expect(writes).toHaveLength(2);
    expect(writes[0].update.name).toContain(`/gravacoes/${id}`);
    expect(writes[0].update.fields).toMatchObject({
      titulo: { stringValue: 'Gravação: Executor nv 240/50 — Tester' }, estado: { stringValue: 'fila' },
      nick: { stringValue: 'Credit' }, contato: { stringValue: 'Contact' }, notas: { stringValue: 'Notes' },
    });
    expect(writes[0].currentDocument).toEqual({ exists: false });
    expect(writes[1].update.name).toContain(`/gravacoes/${id}/arquivo/rrf`);
    expect(writes[1].update.fields.bytes).toEqual({ bytesValue: 'AAH/' });
    for (const write of writes) expect(write.updateTransforms).toEqual([{ fieldPath: 'criadoEm', setToServerValue: 'REQUEST_TIME' }]);
  });
  it('rejects oversized files before making a request and retains server rejection text', async () => {
    const fetcher = vi.fn(async () => new Response('Denied', { status: 403 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(new ReplaySubmissionClient().submit({ ...submission(), bytes: new Uint8Array(MAX_REPLAY_BYTES + 1) })).rejects.toThrow('Arquivo grande demais.');
    expect(fetcher).not.toHaveBeenCalled();
    await expect(new ReplaySubmissionClient().submit(submission())).rejects.toThrow('Firestore respondeu 403: Denied');
  });
});
