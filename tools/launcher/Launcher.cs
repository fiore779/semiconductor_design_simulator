// 半導体設計シミュレーターのランチャー。埋め込んだ単一 HTML を %LOCALAPPDATA% の専用フォルダへ書き出し、
// 既定のブラウザで開く。ネットワーク・ローカルサーバーは使わない(file:// で動く)。
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

static class Launcher
{
    [STAThread]
    static int Main()
    {
        try
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SemiconductorDesignSimulator");
            Directory.CreateDirectory(dir);
            string target = Path.Combine(dir, "index.html");
            byte[] data;
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.html"))
            {
                if (s == null) throw new InvalidOperationException("埋め込み HTML が見つかりません。");
                using (MemoryStream ms = new MemoryStream()) { s.CopyTo(ms); data = ms.ToArray(); }
            }
            // 同じ内容なら書き直さない(同じパスを保つ。ブラウザ内の自動保存は、ファイルのパスごとに分かれるため)
            bool same = false;
            if (File.Exists(target))
            {
                byte[] cur = File.ReadAllBytes(target);
                if (cur.Length == data.Length) { same = true; for (int i = 0; i < cur.Length; i++) if (cur[i] != data[i]) { same = false; break; } }
            }
            if (!same) File.WriteAllBytes(target, data);
            ProcessStartInfo psi = new ProcessStartInfo(target);
            psi.UseShellExecute = true; // 既定のブラウザ(.html の関連付け)で開く
            Process.Start(psi);
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show("起動に失敗しました。\n" + ex.Message + "\n\n同じフォルダの「半導体設計シミュレーター.html」を、ブラウザで直接開いてください。", "半導体設計シミュレーター", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
